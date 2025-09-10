const mongoose = require('mongoose');

const FriendRequestSchema = new mongoose.Schema({
  from: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  to:   { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending','accepted','rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  respondedAt: Date
});

module.exports = mongoose.model('FriendRequest', FriendRequestSchema);
