// // // models/User.js
// // const mongoose = require("mongoose");

// // const userSchema = new mongoose.Schema({
// //   username: { type: String, required: true, unique: true },
// //   email:    { type: String, required: true, unique: true },
// //   password: { type: String, required: true },
  
// //    // optional fields for profile
// //   about: { type: String, default: "" },
// //   profilePicUrl: { type: String, default: "" },
  
// //   resetToken: { type: String },
// //   resetTokenExpiry: { type: Date },
// // }, { timestamps: true });  // timestamps will auto-create createdAt & updatedAt

// // module.exports = mongoose.model("User", userSchema);

// // models/User.js
// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');

// const userSchema = new mongoose.Schema({
//   username: { type: String, required: true },
//   email:    { type: String, required: true, unique: true, index: true },
//   passwordHash: { type: String, required: true },

//   // email verification
//   emailVerified: { type: Boolean, default: false },
//   emailVerifyToken: { type: String },
//   emailVerifyExpires: { type: Date },

//   // other fields...
// }, { timestamps: true });

// // convenience: set password
// userSchema.methods.setPassword = async function(password) {
//   this.passwordHash = await bcrypt.hash(password, 10);
// };

// userSchema.methods.verifyPassword = async function(password) {
//   return bcrypt.compare(password, this.passwordHash);
// };

// module.exports = mongoose.model('User', userSchema);


// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },

  // email verification
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: { type: String },
  emailVerifyExpires: { type: Date },

  // optional profile
  profilePicUrl: { type: String },
  about: { type: String }
}, { timestamps: true });

userSchema.methods.setPassword = async function(password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.verifyPassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
