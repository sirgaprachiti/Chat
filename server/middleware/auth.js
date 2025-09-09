// const jwt = require("jsonwebtoken");
// const SECRET = "supersecret"; // put in .env

// function auth(req, res, next) {
//   const token = req.headers["authorization"]?.split(" ")[1];
//   if (!token) return res.status(401).json({ error: "No token" });

  
//   try {
//     const decoded = jwt.verify(token, SECRET);
//     req.user = decoded;
//     next();
//   } catch (err) {
//     return res.status(403).json({ error: "Invalid token" });
//   }
// }


// module.exports = { auth, SECRET };
// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const SECRET = process.env.JWT_SECRET || "supersecret"; // move to .env in prod

async function auth(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, SECRET);

    // decoded should have { id } if you signed the token like: jwt.sign({ id: user._id }, SECRET)
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user; // attach full mongoose user doc
    next();
  } catch (err) {
    console.error("auth error", err);
    return res.status(403).json({ error: "Invalid token" });
  }
}

module.exports = { auth, SECRET };
