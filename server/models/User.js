


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

//   // optional profile
//   profilePicUrl: { type: String },
//   about: { type: String }
// }, { timestamps: true });

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
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },

  // email verification
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: { type: String },
  emailVerifyExpires: { type: Date },

  // password reset fields
  passwordResetToken: { type: String }, // hashed token
  passwordResetExpires: { type: Date },

  // optional profile
  profilePicUrl: { type: String },
  about: { type: String }
}, { timestamps: true });

/**
 * Set password (hash)
 */
userSchema.methods.setPassword = async function(password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

/**
 * Verify password
 */
userSchema.methods.verifyPassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

/**
 * Create a password reset token:
 * - generate raw token
 * - store hashed token in DB and expiry
 * - return raw token (to send via email)
 */
userSchema.methods.createPasswordResetToken = function() {
  // raw token (send to user via email)
  const rawToken = crypto.randomBytes(32).toString('hex'); // 64 chars
  // hash it before saving to DB
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

  // store hashed token and expiry
  this.passwordResetToken = hashed;
  // expire in 1 hour (adjust if you like)
  this.passwordResetExpires = Date.now() + (60 * 60 * 1000);

  // note: caller should save() the user after calling this
  return rawToken;
};

/**
 * Verify a raw reset token (returns true/false based on hash and expiry)
 */
userSchema.methods.verifyPasswordResetToken = function(rawToken) {
  if (!rawToken || !this.passwordResetToken || !this.passwordResetExpires) return false;
  // check expiry
  if (Date.now() > this.passwordResetExpires.getTime()) return false;

  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
  return hashed === this.passwordResetToken;
};

/**
 * Optional helper to clear reset fields after use
 */
userSchema.methods.clearPasswordReset = function() {
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
};

module.exports = mongoose.model('User', userSchema);
