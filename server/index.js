// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const authRoutes = require("./routes/auth");
// const chatRoutes = require("./routes/chat");

// const app = express();
// app.use(express.json());
// app.use(cors({ origin: "http://localhost:3000", credentials: true })); // adjust frontend port

// // Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/chat", chatRoutes);

// // MongoDB connection
// mongoose.connect("mongodb://127.0.0.1:27017/chatapp", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log("MongoDB connected"))
// .catch(err => console.error("MongoDB connection error:", err));

// const PORT = 5000;
// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
// at top of server.js (replace existing auth require if present)
const { auth } = require('./middleware/auth');

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const resetRoutes = require("./routes/reset");

const app = express();
const server = http.createServer(app);
// Serve uploads statically and configure multer for profile uploads
const path = require('path');
const multer = require('multer');
const User = require('./models/User'); // if you need it elsewhere; safe to require

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


// Socket.io setup
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("message:send", (data) => {
    // Save message to DB...
    io.to(data.receiverId).emit("message:receive", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
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
