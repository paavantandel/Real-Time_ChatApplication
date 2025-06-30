const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  content: String,
  groupId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Group",
  required: false,
},

  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", MessageSchema);

module.exports = Message;
