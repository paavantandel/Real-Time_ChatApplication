const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const authRoutes = require("./Routes/Auth")
const messageRoutes = require("./Routes/Messages");
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

let onlineUsers = {};

io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    onlineUsers[userId] = socket.id;
  });

  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
   const receiverSocketId = onlineUsers[receiverId];

    const messageData = { senderId, message };

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("getMessage", messageData); // 👈 send only to receiver
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, id] of Object.entries(onlineUsers)) {
      if (id === socket.id) delete onlineUsers[userId];
    }
  });
});

server.listen(5000, () => console.log("Backend running on 5000"));
