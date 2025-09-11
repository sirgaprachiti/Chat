const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
// at top of server.js (replace existing auth require if present)
const { auth } = require('./middleware/auth');
const Message = require('./models/Message');
const mongoose = require('mongoose');
require('dotenv').config();
// app.use(express.json());
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const resetRoutes = require("./routes/reset");

const app = express();
const server = http.createServer(app);
// Serve uploads statically and configure multer for profile uploads
const path = require('path');
const multer = require('multer');
const User = require('./models/User'); // if you need it elsewhere; safe to require
// helper: get unread count from a sender to the current user
async function getUnreadCount(fromUserId, toUserId) {
  return await Message.countDocuments({
    senderId: mongoose.Types.ObjectId(fromUserId),
    receiverId: mongoose.Types.ObjectId(toUserId),
    read: false
  });
}

// ensure uploads dir exists (optional runtime guard)
const uploadsDir = path.join(__dirname, 'uploads');
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// static serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    // if auth middleware attaches user doc to req.user, use its id
    const uid = req.user && req.user._id ? String(req.user._id) : 'anon';
    cb(null, `${uid}-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'), false);
    cb(null, true);
  }
});


 app.use(express.json());
// app.use(cors({ origin: "http://localhost:3000", credentials: true }));
const allowedOrigins = [
  "http://localhost:3000",   // React dev (if you use it later)
  "http://127.0.0.1:5500",  // Live Server / Python / VSCode
  "http://localhost:5500"   // if sometimes served with localhost instead of 127.0.0.1
];


app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true
}));



// Routes
app.use('/api/auth', require('./routes/auth'));
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reset", resetRoutes);
// global error handler (JSON)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});
// Profile update (name, about, optional image)
app.post('/api/auth/profile', auth, upload.single('image'), async (req, res) => {
  try {
    // req.user should be a Mongoose user doc (see middleware). If it's the token payload,
    // change to fetch user: const user = await User.findById(req.user.id)
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, about } = req.body;
    if (name) user.username = name;
    if (typeof about !== 'undefined') user.about = about;

    if (req.file) {
      const host = process.env.BACKEND_HOST || `${req.protocol}://${req.get('host')}`;
      user.profilePicUrl = `${host}/uploads/${req.file.filename}`;
    }

    await user.save();

    // return safe user
    const userSafe = {
      _id: user._id,
      username: user.username,
      email: user.email,
      about: user.about,
      profilePicUrl: user.profilePicUrl
    };
    return res.json({ user: userSafe });
  } catch (err) {
    console.error('profile update error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Optionally expose users listing (if you need it)
app.get('/api/auth/users', auth, async (req, res) => {
  try {
    const users = await User.find({}, 'username email profilePicUrl').exec();
    res.json(users);
  } catch (err) {
    console.error('users list error', err);
    res.status(500).json({ error: 'Server error' });
  }
});
const friendsRouter = require('./routes/friends');
app.use('/api/friends', friendsRouter);


const io = new Server(server, { cors: { origin: "*" } });
global.io = io;

// middleware: verify token and attach socket.userId, join user room
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    console.error('Socket auth failed: no token provided', {
      handshakeAuth: socket.handshake.auth,
      handshakeQuery: socket.handshake.query
    });
    return next(new Error('Authentication error: no token'));
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('Socket auth failed: JWT_SECRET not set in env');
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const uid = decoded.id || decoded._id || decoded.userId || null;
    if (!uid) {
      console.error('Socket auth failed: token missing user id payload', decoded);
      return next(new Error('Authentication error: invalid token payload'));
    }

    socket.userId = String(uid);
    socket.join(socket.userId);
    return next();
  } catch (err) {
    console.error('Socket auth error:', err && err.message ? err.message : err);
    return next(new Error('Authentication error: token verify failed'));
  }
});


io.on("connection", (socket) => {
  console.log("User connected:", socket.id, 'userId=', socket.userId);

    // Handle sending a message: persist, emit to recipient, and emit unread count
  socket.on('message:send', async (data, callback) => {
    try {
      const senderId = socket.userId;
      const { receiverId, text, imageId } = data;

      if (!receiverId || (!text && !imageId)) {
        return callback?.({ ok: false, error: 'Invalid payload' });
      }

      const messagePayload = {
        senderId,
        receiverId,
        text: text || '',
        read: false
      };
      if (imageId) {
        messagePayload.imageId = mongoose.Types.ObjectId(imageId);
      }

      const message = await Message.create(messagePayload);

      // Emit the message to the recipient's room (works across devices/tabs)
      io.to(String(receiverId)).emit('message:receive', {
        _id: message._id,
        senderId: String(senderId),
        receiverId: String(receiverId),
        text: message.text,
        imageId: message.imageId,
        read: message.read,
        createdAt: message.createdAt
      });

      // Acknowledge sender (callback)
      callback?.({ ok: true, msg: message });

      // compute unread count for recipient FROM this sender and emit unread:update
      const unreadFromSender = await getUnreadCount(senderId, receiverId);
      io.to(String(receiverId)).emit('unread:update', {
        fromUserId: String(senderId),
        unreadCount: unreadFromSender
      });

    } catch (err) {
      console.error('message:send error', err);
      callback?.({ ok: false, error: err.message || 'Server error' });
    }
  });

  // Mark messages as read when the user opens a chat with `otherUserId`
  socket.on('messages:markRead', async (data, callback) => {
    try {
      const me = socket.userId;
      const other = data.otherUserId;
      if (!me || !other) return callback?.({ ok: false, error: 'Missing ids' });

      const res = await Message.updateMany(
        { senderId: mongoose.Types.ObjectId(other), receiverId: mongoose.Types.ObjectId(me), read: false },
        { $set: { read: true } }
      );

      // Notify this user's devices that unread from that sender is now 0
      io.to(String(me)).emit('unread:update', { fromUserId: String(other), unreadCount: 0 });

      // Optional: inform other participant(s) that I read their messages
      io.to(String(other)).emit('messages:readBy', { conversationWith: me, userId: me });

      callback?.({ ok: true, modified: res.modifiedCount });
    } catch (err) {
      console.error('messages:markRead error', err);
      callback?.({ ok: false, error: err.message });
    }
  });

  // Example: receive a "message:send" from a client and forward to receiver
  // socket.on("message:send", (data) => {
  //   try {
  //     // Basic validation
  //     if (!data || !data.receiverId) {
  //       console.warn('message:send missing receiverId', data);
  //       return;
  //     }

  //     const receiverId = String(data.receiverId);
  //     const msg = {
  //       ...data,
  //       senderId: socket.userId || data.senderId || null,
  //       createdAt: new Date().toISOString()
  //     };

  //     // Emit to that receiver's room (works across devices/tabs)
  //     io.to(receiverId).emit("message:receive", msg);

  //     // Optionally ack sender
  //     socket.emit('message:sent:ack', { ok: true, msg });
  //   } catch (err) {
  //     console.error('message:send handler error', err);
  //   }
  // });

  socket.on("disconnect", (reason) => {
    console.log("User disconnected", socket.id, 'reason=', reason);
    // optional cleanup if you stored connectedUsers map: delete connectedUsers[socket.userId]
  });
});

// // MongoDB connection
// mongoose.connect("mongodb://127.0.0.1:27017/chatapp", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log("MongoDB connected"))
// .catch(err => console.error(err));
connectDB();

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
