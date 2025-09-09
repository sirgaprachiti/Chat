// const express = require("express");
// const bcrypt = require("bcrypt");
// const User = require("../models/User");

// const router = express.Router();

// // Register
// router.post("/signup", async (req, res) => {
//   try {
//     const { username, email, password } = req.body;
//     const hashed = await bcrypt.hash(password, 10);
//     const user = new User({ username, email, password: hashed });
//     await user.save();
//     res.json({ message: "User registered successfully" });
//   } catch (err) {
//     res.status(400).json({ error: "User registration failed" });
//   }
// });

// // Login
// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ error: "Invalid credentials" });

//     const match = await bcrypt.compare(password, user.password);
//     if (!match) return res.status(400).json({ error: "Invalid credentials" });

//     res.json({ message: "Login successful", userId: user._id, username: user.username });
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

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { SECRET } = require("../middleware/auth");

const router = express.Router();


// Register
// router.post("/signup", async (req, res) => {
//   try {
//     const { username, email, password } = req.body;
//     const existing = await User.findOne({ email });
//     if (existing) return res.status(400).json({ error: "Email already exists" });

//     const hashed = await bcrypt.hash(password, 10);
//     const user = new User({ username, email, password: hashed });
//     await user.save();

//     res.json({ message: "User registered successfully" });
//   } catch (err) {
//     res.status(500).json({ error: "Signup failed" });
//   }
// });
// routes/auth.js (signup handler)
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashed });
    await user.save();

    // Return a JSON body (use 201 Created)
    return res.status(201).json({ message: "User registered successfully", user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Signup failed" });
  }
});


// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    // Create JWT
    // const token = jwt.sign({ id: user._id, email: user.email }, SECRET, { expiresIn: "1h" });
// Login (replace the final res.json(...) inside router.post('/login', ...) )
const token = jwt.sign({ id: user._id, email: user.email }, SECRET, { expiresIn: "1h" });

// include profilePicUrl and about so frontend can persist avatar across logins
res.json({
  token,
  user: {
    _id: user._id,
    id: user._id,                // keep 'id' if frontend expects it
    username: user.username,
    email: user.email,
    about: user.about || '',
    profilePicUrl: user.profilePicUrl || ''
  }
});

    // res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Get all users
router.get("/users", async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

module.exports = router;
