const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", MessageSchema);

module.exports = Message;
