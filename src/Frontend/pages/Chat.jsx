import { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const socket = io("http://localhost:5000");

function Chat() {
  const user = JSON.parse(sessionStorage.getItem("user"));
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [receiver, setReceiver] = useState("");
  const [users, setUsers] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    socket.emit("join", user.id);

    socket.on("getMessage", (data) => {
      if (data.senderId !== user.id) {
        setChat((prev) => [...prev, data]);
        toast.info(`New message from ${data.senderId}: ${data.message}`);
      }
    });

    return () => socket.off("getMessage");
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await axios.get("http://localhost:5000/api/auth/users");
      const filtered = res.data.filter(u => u._id !== user.id);
      setUsers(filtered);
    };
    fetchUsers();
  }, []);

  const sendMessage = async () => {
    if (!message.trim()) return;
    const newMessage = { senderId: user.id, message };
    setChat((prev) => [...prev, newMessage]);

    socket.emit("sendMessage", {
      senderId: user.id,
      receiverId: receiver,
      message
    });

    await axios.post("http://localhost:5000/api/message", {
      sender: user.id,
      receiver,
      content: message
    });

    setMessage("");
  };

  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji.native);
  };

  const filteredChat = chat.filter((msg) =>
    msg.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <h1 className="text-xl font-semibold mb-2">Welcome, {user.username}</h1>

      <select
        className="border p-2 rounded w-80 mb-2"
        value={receiver}
        onChange={(e) => setReceiver(e.target.value)}
      >
        <option value="">Select a user to chat with</option>
        {users.map((u) => (
          <option key={u._id} value={u._id}>{u.username}</option>
        ))}
      </select>

      <input
        className="w-full max-w-md p-2 border mb-2 rounded"
        placeholder="Search messages..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="w-full max-w-md h-64 overflow-y-auto border rounded p-2 bg-white">
        {filteredChat.map((msg, i) => (
          <div key={i} className="text-sm mb-1">
            <span className="font-bold">{msg.senderId}</span>: {msg.message}
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2 items-start w-full max-w-md">
        <button onClick={() => setShowEmoji(!showEmoji)} className="text-xl">😊</button>
        {showEmoji && (
          <div className="absolute z-10">
            <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" />
          </div>
        )}
        <input
          className="border p-2 rounded flex-grow"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}

export default Chat;