// // const express = require("express");
// // const bcrypt = require("bcrypt");
// // const User = require("../models/User");

// // const router = express.Router();

// // // Register
// // router.post("/signup", async (req, res) => {
// //   try {
// //     const { username, email, password } = req.body;
// //     const hashed = await bcrypt.hash(password, 10);
// //     const user = new User({ username, email, password: hashed });
// //     await user.save();
// //     res.json({ message: "User registered successfully" });
// //   } catch (err) {
// //     res.status(400).json({ error: "User registration failed" });
// //   }
// // });

// // // Login
// // router.post("/login", async (req, res) => {
// //   try {
// //     const { email, password } = req.body;
// //     const user = await User.findOne({ email });
// //     if (!user) return res.status(400).json({ error: "Invalid credentials" });

// //     const match = await bcrypt.compare(password, user.password);
// //     if (!match) return res.status(400).json({ error: "Invalid credentials" });

// //     res.json({ message: "Login successful", userId: user._id, username: user.username });
// //   } catch (err) {
// //     res.status(500).json({ error: "Login failed" });
// //   }
// // });

// // // Get all users
// // router.get("/users", async (req, res) => {
// //   const users = await User.find().select("-password");
// //   res.json(users);
// // });

// // module.exports = router;

// // const express = require("express");
// // const bcrypt = require("bcrypt");
// // const jwt = require("jsonwebtoken");
// // const User = require("../models/User");
// // const { SECRET } = require("../middleware/auth");

// // const router = express.Router();


// // Register
// // router.post("/signup", async (req, res) => {
// //   try {
// //     const { username, email, password } = req.body;
// //     const existing = await User.findOne({ email });
// //     if (existing) return res.status(400).json({ error: "Email already exists" });

// //     const hashed = await bcrypt.hash(password, 10);
// //     const user = new User({ username, email, password: hashed });
// //     await user.save();

// //     res.json({ message: "User registered successfully" });
// //   } catch (err) {
// //     res.status(500).json({ error: "Signup failed" });
// //   }
// // });
// // routes/auth.js (signup handler)
// // router.post("/signup", async (req, res) => {
// //   try {
// //     const { username, email, password } = req.body;
// //     const existing = await User.findOne({ email });
// //     if (existing) return res.status(400).json({ error: "Email already exists" });

// //     const hashed = await bcrypt.hash(password, 10);
// //     const user = new User({ username, email, password: hashed });
// //     await user.save();

// //     // Return a JSON body (use 201 Created)
// //     return res.status(201).json({ message: "User registered successfully", user: { id: user._id, username: user.username, email: user.email } });
// //   } catch (err) {
// //     console.error("Signup error:", err);
// //     return res.status(500).json({ error: "Signup failed" });
// //   }
// // });

// // routes/auth.js
// const express = require('express');
// const router = express.Router();
// const validator = require('validator');
// const crypto = require('crypto');
// const User = require('../models/User');
// const sendVerificationEmail = require('../utils/sendVerificationEmail');



// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// // const User = require("../models/User");
// const { SECRET } = require("../middleware/auth");

// // POST /api/auth/signup
// router.post('/signup', async (req, res) => {
//   try {
//     const { username, email, password } = req.body;
//     if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
//     if (!validator.isEmail(String(email))) return res.status(400).json({ error: 'Invalid email format' });

//     const normalized = validator.normalizeEmail(email) || email.toLowerCase().trim();

//     // check existing user
//     const exists = await User.findOne({ email: normalized });
//     if (exists) return res.status(409).json({ error: 'Email already registered' });

//     // create user
//     const verifyToken = crypto.randomBytes(24).toString('hex');
//     const verifyExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h

//     const u = new User({
//       username: username.trim(),
//       email: normalized,
//       emailVerified: false,
//       emailVerifyToken: verifyToken,
//       emailVerifyExpires: verifyExpires
//     });
//     await u.setPassword(password);
//     await u.save();

//     // send verification email (do not block signup on email failure, but log it)
//     try {
//       await sendVerificationEmail(u.email, verifyToken);
//     } catch (err) {
//       console.error('sendVerificationEmail failed', err);
//     }

//     return res.json({ message: 'Registered successfully. Please check your email for verification link.' });
//   } catch (err) {
//     console.error('signup error', err);
//     return res.status(500).json({ error: 'Server error' });
//   }
// });

// // GET /api/auth/verify-email?token=...
// router.get('/verify-email', async (req, res) => {
//   try {
//     const token = req.query.token;
//     if (!token) return res.status(400).send('Missing token');

//     const user = await User.findOne({ emailVerifyToken: token, emailVerifyExpires: { $gt: Date.now() } });
//     if (!user) return res.status(400).send('Invalid or expired token');

//     user.emailVerified = true;
//     user.emailVerifyToken = undefined;
//     user.emailVerifyExpires = undefined;
//     await user.save();

//     // redirect to frontend login with success message (adjust FRONTEND_URL in .env)
//     return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5500'}/index.html?verified=1`);
//   } catch (err) {
//     console.error('verify-email error', err);
//     return res.status(500).send('Server error');
//   }
// });

// module.exports = router;


// // Login
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ error: "Invalid credentials" });

//     const match = await bcrypt.compare(password, user.password);
//     if (!match) return res.status(400).json({ error: "Invalid credentials" });

//     // Create JWT
//     // const token = jwt.sign({ id: user._id, email: user.email }, SECRET, { expiresIn: "1h" });
// // Login (replace the final res.json(...) inside router.post('/login', ...) )
// const token = jwt.sign({ id: user._id, email: user.email }, SECRET, { expiresIn: "1h" });

// // include profilePicUrl and about so frontend can persist avatar across logins
// res.json({
//   token,
//   user: {
//     _id: user._id,
//     id: user._id,                // keep 'id' if frontend expects it
//     username: user.username,
//     email: user.email,
//     about: user.about || '',
//     profilePicUrl: user.profilePicUrl || ''
//   }
// });

//     // res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
//   } catch (err) {
//     res.status(500).json({ error: "Login failed" });
//   }
// });

// // Get all users
// router.get("/users", async (req, res) => {
//   const users = await User.find().select("-password");
//   res.json(users);
// });

// module.exports = router;


// routes/auth.js
const express = require('express');
const router = express.Router();
const validator = require('validator');
const crypto = require('crypto');
const User = require('../models/User');
const sendVerificationEmail = require('../utils/sendVerificationEmail');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    if (!validator.isEmail(String(email))) return res.status(400).json({ error: 'Invalid email format' });

    const normalized = validator.normalizeEmail(email) || email.toLowerCase().trim();

    // check if exists
    if (await User.findOne({ email: normalized })) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const verifyToken = crypto.randomBytes(24).toString('hex');
    console.log('SIGNUP -> generated verifyToken:', verifyToken);
    const verifyExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h

    const u = new User({
      username: username.trim(),
      email: normalized,
      emailVerified: false,
      emailVerifyToken: verifyToken,
      emailVerifyExpires: verifyExpires
    });

    await u.setPassword(password);
    await u.save();

    // try to send verification email (don't fail signup on mail error)
    try {
      await sendVerificationEmail(u.email, verifyToken);
    } catch (err) {
      console.error('Failed sending verification email', err);
      // optionally: inform user but still allow account creation
    }

    return res.json({ message: 'Registered successfully. Please check your email for verification link.' });
  } catch (err) {
    console.error('signup error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
  try {
    const token = req.query.token;

    console.log('VERIFY route called. token.length=', token ? token.length : 'no token', 'token=', token);
    if (!token) return res.status(400).send('Missing token');

    const user = await User.findOne({ emailVerifyToken: token, emailVerifyExpires: { $gt: Date.now() } });
    console.log('VERIFY -> found user?', !!user, user ? { id: user._id, email: user.email, tokenInDb: user.emailVerifyToken } : null);
    if (!user) return res.status(400).send('Invalid or expired token');

    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    // redirect to frontend (show success)
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5500';
    return res.redirect(`${frontend}/index.html?verified=1`);
  } catch (err) {
    console.error('verify-email error', err);
    return res.status(500).send('Server error');
  }
});

// POST /api/auth/resend-verify  { email }
router.post('/resend-verify', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !validator.isEmail(String(email))) return res.status(400).json({ error: 'Invalid email' });

    const normalized = validator.normalizeEmail(email);
    const user = await User.findOne({ email: normalized });
    if (!user) return res.status(404).json({ error: 'No user with that email' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

    // throttle logic is recommended — here we simply create new token
    const verifyToken = crypto.randomBytes(24).toString('hex');
    user.emailVerifyToken = verifyToken;
    user.emailVerifyExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    try {
      await sendVerificationEmail(user.email, verifyToken);
    } catch (err) {
      console.error('resend verification failed', err);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    return res.json({ message: 'Verification email resent' });
  } catch (err) {
    console.error('resend-verify error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login  { email, password } -> returns JWT only if emailVerified true
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const normalized = validator.normalizeEmail(email);
    const user = await User.findOne({ email: normalized });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Email not verified. Check your inbox.' });
    }

    // create token (payload minimal)
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({ token, user: { _id: user._id, username: user.username, email: user.email, profilePicUrl: user.profilePicUrl } });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
