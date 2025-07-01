const express = require("express");
const Message = require("../Models/Message");
const router = express.Router();

router.post("/", async (req, res) => {
  const msg = await Message.create(req.body);
  res.status(201).json(msg);
});

router.get("/:user1/:user2", async (req, res) => {
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
router.get('/group/:groupId', async (req, res) => {
  const messages = await Message.find({ receiver: req.params.groupId });
  res.json(messages);
});

// Get private messages
router.get('/private/:userId/:otherUserId', async (req, res) => {
  const { userId, otherUserId } = req.params;
  const messages = await Message.find({
    $or: [
      { sender: userId, receiver: otherUserId },
      { sender: otherUserId, receiver: userId }
    ]
  });
  res.json(messages);
});


module.exports = router;
