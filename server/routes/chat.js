

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

// ---------------------- Deletion endpoints ----------------------
// Delete entire conversation with a given user (and cleanup files)
router.delete('/delete/:userId', auth, async (req, res) => {
  try {
    const otherId = req.params.userId;
    const myId = String(req.user.id);

    // Find messages in the conversation
    const msgs = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId }
      ]
    }).select('_id imageId fileId').lean();

    if (!msgs || msgs.length === 0) {
      // Nothing to delete
      return res.json({ message: 'No messages to delete' });
    }

    const msgIds = msgs.map(m => m._id);

    // Collect GridFS ids referenced
    const imageIds = msgs.map(m => m.imageId).filter(Boolean).map(id => String(id));
    const fileIds = msgs.map(m => m.fileId).filter(Boolean).map(id => String(id));

    // Delete the message documents
    await Message.deleteMany({ _id: { $in: msgIds } });

    // Delete files from GridFS safely
    const conn = mongoose.connection;

    // helper to delete ids from a bucket if exists
    async function deleteFromBucket(ids, bucketName) {
      if (!ids || ids.length === 0) return;
      try {
        const bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName });
        for (let idStr of ids) {
          try {
            const fileId = new mongoose.Types.ObjectId(idStr);
            // optionally check file metadata before deleting (skip if not found)
            const files = await conn.db.collection(`${bucketName}.files`).find({ _id: fileId }).toArray();
            if (!files || files.length === 0) continue;
            // only delete if file metadata exists (could check uploadedBy here if you prefer)
            await bucket.delete(fileId);
          } catch (err) {
            // if file not found or invalid id just continue
            console.warn(`Failed deleting from ${bucketName} id=${idStr}:`, err.message || err);
          }
        }
      } catch (err) {
        console.error('deleteFromBucket error for', bucketName, err);
      }
    }

    // perform deletions (fire-and-forget style but awaited)
    await deleteFromBucket(imageIds, 'chat_images');
    await deleteFromBucket(fileIds, 'chat_files');

    return res.json({ message: 'Conversation deleted', deletedMessages: msgIds.length });
  } catch (err) {
    console.error('DELETE /delete/:userId error', err);
    return res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Bulk delete messages by id (used for "delete selected")
// Request: { messageIds: ["id1","id2", ...] }
router.post('/messages/delete', auth, async (req, res) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds array required' });
    }

    const myId = String(req.user.id);

    // Normalize ObjectIds
    const normalizedIds = messageIds.map(id => {
      try { return new mongoose.Types.ObjectId(id); } catch(e){ return null; }
    }).filter(Boolean);

    if (normalizedIds.length === 0) {
      return res.status(400).json({ error: 'No valid message IDs provided' });
    }

    // Fetch messages and ensure the auth user is participant (sender or receiver)
    const msgs = await Message.find({ _id: { $in: normalizedIds } }).select('_id senderId receiverId imageId fileId').lean();

    if (!msgs || msgs.length === 0) {
      return res.json({ message: 'No messages found' });
    }

    // Partition messages that the user is allowed to delete
    const allowDelete = msgs.filter(m => String(m.senderId) === myId || String(m.receiverId) === myId);
    if (allowDelete.length === 0) {
      return res.status(403).json({ error: 'You are not allowed to delete these messages' });
    }

    const idsToDelete = allowDelete.map(m => m._id);
    const imageIds = allowDelete.map(m => m.imageId).filter(Boolean).map(String);
    const fileIds = allowDelete.map(m => m.fileId).filter(Boolean).map(String);

    // delete message docs
    await Message.deleteMany({ _id: { $in: idsToDelete } });

    // Delete files from GridFS only if the requester uploaded them (safe policy)
    const conn = mongoose.connection;
    async function deleteIfUploadedByMe(ids, bucketName) {
      if (!ids || ids.length === 0) return;
      const bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName });
      for (let idStr of ids) {
        try {
          const fileId = new mongoose.Types.ObjectId(idStr);
          const files = await conn.db.collection(`${bucketName}.files`).find({ _id: fileId }).toArray();
          if (!files || files.length === 0) continue;
          const metadata = files[0].metadata || {};
          // Only delete if uploadedBy equals current user id (prevents removing someone else's file)
          if (String(metadata.uploadedBy) === myId) {
            try {
              await bucket.delete(fileId);
            } catch (err) {
              console.warn(`GridFS delete failed for ${bucketName} ${idStr}`, err.message || err);
            }
          } else {
            console.log(`Skipping GridFS delete for ${bucketName} ${idStr} (uploadedBy != you)`);
          }
        } catch (err) {
          console.warn(`Invalid file id ${idStr} in bucket ${bucketName}:`, err.message || err);
        }
      }
    }

    await deleteIfUploadedByMe(imageIds, 'chat_images');
    await deleteIfUploadedByMe(fileIds, 'chat_files');

    return res.json({ message: 'Messages deleted', deletedCount: idsToDelete.length });
  } catch (err) {
    console.error('POST /messages/delete error', err);
    return res.status(500).json({ error: 'Failed to delete messages' });
  }
});



module.exports = router;

