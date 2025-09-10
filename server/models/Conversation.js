const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  unreadCounts: { type: Map, of: Number, default: {} }, // key: userId string -> count
  lastMessage: {
    text: String,
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', ConversationSchema);
