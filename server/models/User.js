// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
   // optional fields for profile
  about: { type: String, default: "" },
  profilePicUrl: { type: String, default: "" },
  
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
}, { timestamps: true });  // timestamps will auto-create createdAt & updatedAt

module.exports = mongoose.model("User", userSchema);
