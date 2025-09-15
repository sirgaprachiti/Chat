require('dotenv').config();
const express = require('express');
const jwt = require("jsonwebtoken");

const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
// at top of server.js (replace existing auth require if present)
const { auth } = require('./middleware/auth');
const Message = require('./models/Message');
const mongoose = require('mongoose');

// app.use(express.json());
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const resetRoutes = require("./routes/reset");

const app = express();

// --- allowed origins ------------------------------------------------------
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://chat-2-wvf1.onrender.com';
const PROD_FRONTENDS = [
  'https://chat-2-wvf1.onrender.com',
  'https://chat-1-2ru.onrender.com'
];
const DEV_ORIGINS = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://localhost:3000'
];

const allowedOrigins = Array.from(new Set([FRONTEND_ORIGIN, ...PROD_FRONTENDS, ...DEV_ORIGINS]));

// --- simple explicit preflight handler (temporary, robust) ----------------
function getAllowedOrigin(origin) {
  if (!origin) return null; // curl/postman/no-origin
  return allowedOrigins.includes(origin) ? origin : null;
}

// Handle CORS preflight right away so Express doesn't 404 OPTIONS
app.use((req, res, next) => {
  console.log('PRELIGHT LOG - method:', req.method, 'url:', req.originalUrl, 'origin:', req.get('Origin'));

  const origin = getAllowedOrigin(req.get('Origin'));
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    const reqHeaders = req.header('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-Requested-With';
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', reqHeaders);
    return res.status(204).end();
  }

  next();
});
// -------------------------------------------------------------------------

// Now also use the cors() middleware for normal requests (optional/redundant)
const cors = require('cors');
const corsOptions = {
  origin: (origin, cb) => {
    console.log('CORS incoming origin (corsOptions):', origin);
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
};
app.use(cors(corsOptions));
// app.options('*', cors(corsOptions)); // ensure express answers OPTIONS too



app.get('/api/auth/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

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


// after creating `server` (http.createServer(app))
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,   // same list as express
    methods: ['GET','POST'],
    credentials: true
  }
});
global.io = io;
// --- CORS preflight handler for /api/auth/* (use BEFORE mounting authRoutes) ---
app.options(/^\/api\/auth(\/.*)?$/, (req, res) => {
  const origin = req.get('Origin') || '';
  // echo the origin back only if allowed
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  const reqHeaders = req.header('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-Requested-With';
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', reqHeaders);

  // 204 No Content — satisfied preflight
  return res.sendStatus(204);
});




app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reset", resetRoutes);
// global error handler (JSON)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
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

// also add a generic health if you want
app.get('/api/health', (req, res) => res.send('OK'));

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

// helper: emit to a user's room (works for multiple devices)
function sendToUser(userId, event, payload) {
  if (!userId) return;
  try {
    io.to(String(userId)).emit(event, payload);
    console.log(`Emitted ${event} to user ${String(userId)}`);
  } catch (err) {
    console.error('sendToUser error', err);
  }
}




// io.on("connection", (socket) => {
//   console.log("User connected:", socket.id, 'userId=', socket.userId);

//   // Mark messages as read when the user opens a chat with `otherUserId`
//   socket.on('messages:markRead', async (data, callback) => {
//     try {
//       const me = socket.userId;
//       const other = data?.otherUserId;
//       if (!me || !other) return callback?.({ ok: false, error: 'Missing ids' });

//       const res = await Message.updateMany(
//         { senderId: mongoose.Types.ObjectId(other), receiverId: mongoose.Types.ObjectId(me), read: false },
//         { $set: { read: true } }
//       );

      
// sendToUser(me, 'unread:update', { fromUserId: String(other), unreadCount: 0 });

// // optionally notify the other party that I read their messages
// sendToUser(other, 'messages:readBy', { conversationWith: me, userId: me });

//       callback?.({ ok: true, modified: res.modifiedCount ?? 0 });
//     } catch (err) {
//       console.error('messages:markRead error', err);
//       callback?.({ ok: false, error: err.message || 'Server error' });
//     }
//   });

//   // Send initial unread counts when user asks
//   socket.on('request_unread_counts', async (userId) => {
//     try {
//       if (!userId) return socket.emit('unread_counts_update', {});
//       const unreadCounts = await Message.aggregate([
//         { $match: { receiverId: mongoose.Types.ObjectId(userId), read: false } },
//         { $group: { _id: "$senderId", count: { $sum: 1 } } }
//       ]);

//       const countsObj = {};
//       unreadCounts.forEach(item => { countsObj[String(item._id)] = item.count; });

//       socket.emit('unread_counts_update', countsObj);
//     } catch (err) {
//       console.error('Error fetching unread counts:', err);
//       socket.emit('unread_counts_update', {});
//     }
//   });

//   // Other socket handlers (e.g. message sending) go here

//   socket.on("disconnect", (reason) => {
//     console.log("User disconnected", socket.id, 'userId=', socket.userId, 'reason=', reason);
//     // optional cleanup if you stored connectedUsers map: delete connectedUsers[socket.userId]
//   });
// });

io.on("connection", (socket) => {
  console.log("User connected:", socket.id, 'userId=', socket.userId);

    socket.on("user:online", ({ userId }) => {
    const room = String(userId).trim(); // normalize here
    socket.userId = room;
    socket.join(room);
    console.log("user:online -> joined room", room, "socket.id=", socket.id);
  });
  // --- Helper within scope (optional) ---
  // If you didn't add sendToUser globally, this uses global.io if present.
  const emitToUser = (userId, event, payload) => {
    try {
      if (!userId) return;
      if (typeof sendToUser === 'function') {
        return sendToUser(userId, event, payload);
      }
      if (global.io) {
        return global.io.to(String(userId)).emit(event, payload);
      }
      // fallback: emit to socket if same user
      if (String(socket.userId) === String(userId)) socket.emit(event, payload);
    } catch (err) {
      console.error('emitToUser error', err);
    }
  };

  // Request aggregated unread counts for the connected user
  socket.on('request_unread_counts', async (userId) => {
    try {
      if (!userId) return socket.emit('unread_counts_update', {});
      const unreadCounts = await Message.aggregate([
        { $match: { receiverId: mongoose.Types.ObjectId(userId), read: false } },
        { $group: { _id: "$senderId", count: { $sum: 1 } } }
      ]);
      const countsObj = {};
      unreadCounts.forEach(item => { countsObj[String(item._id)] = item.count; });
      socket.emit('unread_counts_update', countsObj);
    } catch (err) {
      console.error('Error fetching unread counts:', err);
      socket.emit('unread_counts_update', {});
    }
  });

  // Mark messages as read when the user opens a chat with `otherUserId`
  // Accepts either { otherUserId } or { userId, peerId } shapes; supports callback ack.
  socket.on('messages:markRead', async (data = {}, callback) => {
    try {
      // normalize
      const me = socket.userId || String(data.userId || '');
      const other = String(data.otherUserId || data.peerId || data.other || '');

      if (!me || !other) {
        const errPayload = { ok: false, error: 'Missing ids' };
        if (typeof callback === 'function') return callback(errPayload);
        return socket.emit('messages:markRead:error', errPayload);
      }

      const res = await Message.updateMany(
        { senderId: mongoose.Types.ObjectId(other), receiverId: mongoose.Types.ObjectId(me), read: false },
        { $set: { read: true } }
      );

      // Notify this user's devices that unread from that sender is now 0
      emitToUser(me, 'unread:update', { fromUserId: String(other), unreadCount: 0 });

      // Optionally inform other participant(s) that I read their messages
      emitToUser(other, 'messages:readBy', { conversationWith: me, userId: me });

      if (typeof callback === 'function') return callback({ ok: true, modified: res.modifiedCount ?? 0 });
      return;
    } catch (err) {
      console.error('messages:markRead error', err);
      if (typeof callback === 'function') return callback({ ok: false, error: err.message || 'Server error' });
    }
  });

  // Example placeholder for other socket handlers (message sending etc.)
  // socket.on('message:send', async (data) => { ... })

  socket.on("disconnect", (reason) => {
    console.log("User disconnected", socket.id, 'userId=', socket.userId, 'reason=', reason);
  });
});

// server.js (or wherever io is created)
io.use((socket, next) => {
  try {
    // token passed from client: io(API_BASE, { auth: { token } })
    const token = socket.handshake?.auth?.token;
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // your JWT verify
    socket.userId = String(decoded.id ?? decoded._id);
  } catch (e) {
    // optionally reject: next(new Error('auth error'));
  }
  next();
});

io.on('connection', (socket) => {
  console.log('User connected', socket.id, 'userId=', socket.userId);
  if (socket.userId) {
    socket.join(String(socket.userId));
    console.log('socket joined room', socket.userId);
  }

  socket.on('user:online', ({ userId }) => {
    if (userId) {
      socket.userId = String(userId);
      socket.join(String(userId));
      console.log('user:online -> joined room', userId);
    }
  });

  socket.on('disconnect', reason => {
    console.log('disconnect', socket.id, socket.userId, reason);
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Could not start server due to DB error', err);
  process.exit(1);
});
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Client will emit: socket.emit('user:online', { userId: '...' })
  socket.on('user:online', (payload) => {
    try {
      // accept either payload.userId OR payload.id OR plain string payload
      let userId = '';

      if (!payload) {
        userId = '';
      } else if (typeof payload === 'string') {
        userId = payload;
      } else {
        userId = payload.userId ?? payload.id ?? '';
      }

      userId = String(userId || '').trim();

      if (!userId) {
        console.warn('user:online received but no userId provided from socket', socket.id, 'payload=', payload);
        // optionally emit back an error or request the client to resend correctly
        return;
      }

      socket.join(userId);
      console.log('user:online -> joined room', userId, 'socket.id=', socket.id);
    } catch (err) {
      console.error('user:online handler error', err);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected', socket.id, 'reason=', reason);
  });
});
