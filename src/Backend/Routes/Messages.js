const express = require("express");
const Message = require("../Models/Message");
const router = express.Router();

// Create message (group or private)
router.post("/", async (req, res) => {
  try {
    const { sender, receiver, groupId, content } = req.body;

    const msg = new Message({
      sender,
      receiver: groupId ? undefined : receiver,
      groupId: groupId || undefined,
      content
    });

    await msg.save();
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get private messages
router.get("/private/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;
  const messages = await Message.find({
    $or: [
      { sender: user1, receiver: user2 },
      { sender: user2, receiver: user1 }
    ]
  }).sort("createdAt");
  res.json(messages);
});

// Get group messages
router.get("/group/:groupId", async (req, res) => {
  const { groupId } = req.params;
  const messages = await Message.find({ groupId }).sort("createdAt");
  res.json(messages);
});

module.exports = router;
