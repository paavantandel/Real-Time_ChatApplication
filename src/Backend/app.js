const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const authRoutes = require("./Routes/Auth")
const messageRoutes = require("./Routes/Messages");
const GroupRoutes = require("./Routes/Group");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

main()
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

async function main() {
  console.log("Connecting to:", process.env.MONGODB_URI); // temporary debug
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/group", GroupRoutes);

const onlineUsers = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join private room
  socket.on("join", (userId) => {
    onlineUsers[userId] = socket.id;
    console.log(`${userId} is online with socket ID: ${socket.id}`);
  });

  // Send private message
  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const receiverSocketId = onlineUsers[receiverId];
    const messageData = { senderId, message };

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("getMessage", messageData);
    }
  });

  // Join a group chat room
  socket.on("joinGroup", (groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.id} joined group ${groupId}`);
  });

  // Send message to group
  socket.on("sendGroupMessage", ({ senderId, groupId, message }) => {
    io.to(groupId).emit("getGroupMessage", { senderId, groupId, message });
  });

  // Remove user on disconnect
  socket.on("disconnect", () => {
    for (const [userId, socketId] of Object.entries(onlineUsers)) {
      if (socketId === socket.id) {
        delete onlineUsers[userId];
        console.log(`${userId} disconnected`);
        break;
      }
    }
  });
});


server.listen(5000, () => console.log("Backend running on 5000"));
