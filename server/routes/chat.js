// const express = require("express");
// const Message = require("../models/Message");

// const router = express.Router();

// // Send a message
// router.post("/send", async (req, res) => {
//   try {
//     const { senderId, receiverId, text, image } = req.body;
//     const msg = new Message({ senderId, receiverId, text, image });
//     await msg.save();
//     res.json({ message: "Message sent", msg });
//   } catch (err) {
//     res.status(400).json({ error: "Failed to send message" });
//   }
// });

// // Get messages between two users
// router.get("/:user1/:user2", async (req, res) => {
//   const { user1, user2 } = req.params;
//   const messages = await Message.find({
//     $or: [
//       { senderId: user1, receiverId: user2 },
//       { senderId: user2, receiverId: user1 }
//     ]
//   }).sort({ createdAt: 1 });
//   res.json(messages);
// });

// module.exports = router;

const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const Message = require("../models/Message");
const { auth } = require("../middleware/auth");

const router = express.Router();

// GridFS Storage
const storage = new GridFsStorage({
  url: "mongodb://127.0.0.1:27017/chatapp",
  file: (req, file) => {
    return { filename: Date.now() + "-" + file.originalname, bucketName: "chat_images" };
  }
});
const upload = multer({ storage });

// Send a message (text only)
router.post("/send", auth, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const msg = new Message({ senderId: req.user.id, receiverId, text });
    await msg.save();
    res.json({ message: "Message sent", msg });
  } catch (err) {
    res.status(400).json({ error: "Failed to send message" });
  }
});

// Send a message with image
router.post("/send-image", auth, upload.single("image"), async (req, res) => {
  try {
    const { receiverId } = req.body;
    const msg = new Message({
      senderId: req.user.id,
      receiverId,
      imageId: req.file.id
    });
    await msg.save();
    res.json({ message: "Image sent", msg });
  } catch (err) {
    res.status(400).json({ error: "Failed to send image" });
  }
});

// Get messages between two users
router.get("/:userId", auth, async (req, res) => {
  const { userId } = req.params;
  const messages = await Message.find({
    $or: [
      { senderId: req.user.id, receiverId: userId },
      { senderId: userId, receiverId: req.user.id }
    ]
  }).sort({ createdAt: 1 });
  res.json(messages);
});

module.exports = router;

