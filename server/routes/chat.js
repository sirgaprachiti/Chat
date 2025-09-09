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
// const upload = multer({ storage });
// use memory storage instead of multer-gridfs-storage
const upload = multer({ storage: multer.memoryStorage() });
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
// router.post("/send-image", auth, upload.single("image"), async (req, res) => {
//   try {
//     const { receiverId } = req.body;
//     const msg = new Message({
//       senderId: req.user.id,
//       receiverId,
//       imageId: req.file.id
//     });
//     await msg.save();
//     res.json({ message: "Image sent", msg });
//   } catch (err) {
//     res.status(400).json({ error: "Failed to send image" });
//   }
// });

// routes/chat.js - send-image handler (replace existing)
router.post("/send-image", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const receiverId = req.body.receiverId;
    if (!receiverId) return res.status(400).json({ error: "receiverId required" });

    // ensure DB connected
    const conn = mongoose.connection;
    if (conn.readyState !== 1) {
      return res.status(503).json({ error: "Database connection must be open to store files" });
    }

    // stream buffer into GridFS
    const bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: "chat_images" });
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: { uploadedBy: req.user.id, originalName: req.file.originalname }
    });

    uploadStream.end(req.file.buffer);

    uploadStream.once("error", (err) => {
      console.error("GridFS upload error:", err);
      if (!res.headersSent) return res.status(500).json({ error: "Failed to store file" });
    });
uploadStream.once("finish", async () => {
  try {
    const msg = new Message({
      senderId: req.user.id,
      receiverId: req.body.receiverId,
      imageId: uploadStream.id   // <-- use uploadStream.id
    });
    await msg.save();

    const msgObj = msg.toObject();
    msgObj.imageId = String(uploadStream.id);

    return res.status(201).json({ message: "Image sent", msg: msgObj });
  } catch (err) {
    console.error("Error saving message after file upload:", err);
    return res.status(500).json({ error: "Failed to save message" });
  }
});

    // uploadStream.once("finish", async (file) => {
    //   try {
    //     // create message and save GridFS file id into imageId
    //     const msg = new Message({
    //       senderId: req.user.id,
    //       receiverId,
    //       imageId: file._id
    //     });
    //     await msg.save();

    //     // convert to plain object and ensure imageId is string for frontend
    //     const msgObj = msg.toObject();
    //     msgObj.imageId = String(file._id);

    //     return res.status(201).json({ message: "Image sent", msg: msgObj });
    //   } catch (err) {
    //     console.error("Error saving message after upload:", err);
    //     return res.status(500).json({ error: "Failed to save message" });
    //   }
    // });
  } catch (err) {
    console.error("send-image unexpected error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
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

// ⚡ Add this new route to serve images from GridFS
router.get("/image/:id", async (req, res) => {
  try {
    const conn = mongoose.connection;
    const gfs = new mongoose.mongo.GridFSBucket(conn.db, {
      bucketName: "chat_images"
    });

    const fileId = new mongoose.Types.ObjectId(req.params.id);

    // Find file metadata first
    const files = await conn.db.collection("chat_images.files").find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    // Stream the file back
    res.set("Content-Type", files[0].contentType || "image/jpeg");
    const downloadStream = gfs.openDownloadStream(fileId);
    downloadStream.pipe(res);
  } catch (err) {
    console.error("Image fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch image" });
  }
});


// Upload any file (docs, pdf, etc.)
router.post("/send-file", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { receiverId } = req.body;

    const conn = mongoose.connection;
    const bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: "chat_files" });

    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: { uploadedBy: req.user.id }
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on("finish", async (file) => {
      const msg = new Message({
        senderId: req.user.id,
        receiverId,
        fileId: file._id
      });
      await msg.save();
      return res.status(201).json({ message: "File sent", msg });
    });
  } catch (err) {
    console.error("send-file error:", err);
    return res.status(500).json({ error: "Failed to send file" });
  }
});

// Serve file for download
router.get("/file/:id", async (req, res) => {
  try {
    const conn = mongoose.connection;
    const bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: "chat_files" });
    const fileId = new mongoose.Types.ObjectId(req.params.id);

    const files = await conn.db.collection("chat_files.files").find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileMeta = files[0];
    res.set("Content-Type", fileMeta.contentType || "application/octet-stream");
    res.set("Content-Disposition", `attachment; filename="${fileMeta.filename}"`);

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.pipe(res);
  } catch (err) {
    console.error("file fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch file" });
  }
});


module.exports = router;

