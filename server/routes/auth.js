


// routes/auth.js
const express = require('express');
const router = express.Router();
const validator = require('validator');
const crypto = require('crypto');
const User = require('../models/User');
const sendVerificationEmail = require('../utils/sendVerificationEmail');
const jwt = require('jsonwebtoken');
const sendResetEmail = require('../utils/sendResetEmail'); // create this file
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


// POST /api/auth/reset-request
// router.post('/reset-request', async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email) return res.status(400).json({ error: 'Missing email' });

//     const normalized = (email || '').toLowerCase().trim();
//     const user = await User.findOne({ email: normalized });
//     if (!user) {
//       // don't reveal whether email exists — respond OK
//       return res.json({ message: 'If the email exists, a reset link has been sent.' });
//     }

//     // make token, expiry (e.g. 1 hour)
//     const rawToken = crypto.randomBytes(32).toString('hex');
//     const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

//     user.passwordResetToken = hashed;
//     user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
//     await user.save();

//     try {
//       await sendResetEmail(user.email, rawToken);
//     } catch (err) {
//       console.error('send reset email failed', err);
//       // still respond success (don't leak internal errors)
//     }

//     return res.json({ message: 'If the email exists, a reset link has been sent.' });
//   } catch (err) {
//     console.error('reset-request error', err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// backend: routes/auth.js (example)
// const crypto = require('crypto');
// assume User model and sendResetEmail are already imported/available

router.post('/reset-request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const normalized = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalized });

    if (!user) {
      // EXPLICIT: reveal that the email is not registered
      return res.status(404).json({ error: 'This email is not registered.' });
    }

    // create token and expiry
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetToken = hashed;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    try {
      await sendResetEmail(user.email, rawToken);
    } catch (err) {
      console.error('send reset email failed', err);
      // We still return success: the action succeeded from the client's POV.
    }

    return res.json({ message: 'Password reset link sent to your email.' });
  } catch (err) {
    console.error('reset-request error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/auth/reset (token + newPassword)
router.post('/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Missing fields' });

    // hash the provided token to compare with stored hash
    const hashed = crypto.createHash('sha256').update(String(token)).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    // set new password - if you have setPassword method reuse it
    // Example with bcrypt:
    // const saltRounds = 10;
    // const hash = await bcrypt.hash(password, saltRounds);
    // user.passwordHash = hash; // adapt field name to your User model
    // user.passwordResetToken = undefined;
    // user.passwordResetExpires = undefined;
    // await user.save();

    // recommended: use model helper
await user.setPassword(password);   // uses bcrypt inside model
user.clearPasswordReset && user.clearPasswordReset(); // clear fields if helper exists
// or explicitly:
user.passwordResetToken = undefined;
user.passwordResetExpires = undefined;
await user.save();


    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('reset error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
