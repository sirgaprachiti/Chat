const express = require('express');
const router = express.Router();
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User'); // if needed
const { auth } = require('../middleware/auth');
const mongoose = require('mongoose');

// send request
router.post('/request', auth, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'to is required' });
    if (String(to) === String(req.user.id)) return res.status(400).json({ error: "Can't request yourself" });

    // prevent duplicates: existing pending between same pair
    const exists = await FriendRequest.findOne({
      $or: [
        { from: req.user.id, to },
        { from: to, to: req.user.id } // optionally block cross-pending
      ],
      status: 'pending'
    });
    if (exists) return res.status(409).json({ error: 'Request already pending' });

    const fr = await FriendRequest.create({ from: req.user.id, to });
    // optional: populate from/to for response
    const payload = await fr.populate('from', 'username _id').execPopulate();

    // try to emit socket notification to recipient (if you have socket mapping)
    // e.g. global io available (set it in app) -> io.to(recipientSocketId).emit(...)
    if (global.io) {
      global.io.emit('friend:request', { request: fr, from: { _id: req.user.id, username: req.user.username } , to });
      // better: emit to specific room/user if you map userId -> socketId(s)
    }

    res.status(201).json({ message: 'Request sent', request: fr });
  } catch (err) {
    console.error('send friend request error', err);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// respond to request (accept/reject)
router.post('/respond', auth, async (req, res) => {
  try {
    const { requestId, action } = req.body; // action = 'accept'|'reject'
    if (!requestId || !action) return res.status(400).json({ error: 'requestId and action required' });
    if (!['accept','reject'].includes(action)) return res.status(400).json({ error: 'invalid action' });

    const reqDoc = await FriendRequest.findById(requestId);
    if (!reqDoc) return res.status(404).json({ error: 'Request not found' });
    if (String(reqDoc.to) !== String(req.user.id)) return res.status(403).json({ error: 'Not authorized' });
    if (reqDoc.status !== 'pending') return res.status(400).json({ error: 'Request already handled' });

    reqDoc.status = action === 'accept' ? 'accepted' : 'rejected';
    reqDoc.respondedAt = new Date();
    await reqDoc.save();

    // optional: add friendship relation — depends on your user schema
    // Example: User.updateOne({_id: req.user.id}, {$push:{contacts: reqDoc.from}})...

    // notify sender via socket
    if (global.io) {
      global.io.emit('friend:response', { requestId: reqDoc._id, to: req.user.id, status: reqDoc.status });
    }

    res.json({ message: 'Response saved', request: reqDoc });
  } catch (err) {
    console.error('respond friend request error', err);
    res.status(500).json({ error: 'Failed to respond' });
  }
});

// list incoming requests
router.get('/requests', auth, async (req, res) => {
  try {
    const incoming = await FriendRequest.find({ to: req.user.id, status: 'pending' }).populate('from', 'username _id');
    res.json(incoming);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load requests' });
  }
});

module.exports = router;
