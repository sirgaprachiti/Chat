// // models/Message.js
// const mongoose = require("mongoose");

// const messageSchema = new mongoose.Schema({
//   senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   text:       { type: String },                 // optional, if it's a text message
//   imageId:    { type: mongoose.Schema.Types.ObjectId }, // GridFS file reference
// }, { timestamps: true }); // adds createdAt & updatedAt automatically

// module.exports = mongoose.model("Message", messageSchema);


const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text:       { type: String },
  imageId:    { type: mongoose.Schema.Types.ObjectId }, // <-- ensure present
  read:       { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
