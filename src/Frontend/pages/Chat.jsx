import { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import v2 from "../../assets/v2.mp4"; 


const socket = io("http://localhost:5000");

function Chat() {
  const user = JSON.parse(sessionStorage.getItem("user"));
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [receiver, setReceiver] = useState("");
  const [users, setUsers] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [chatMap, setChatMap] = useState({}); // { chatId: [messages...] }


  console.log("User:", users);
  useEffect(() => {
    socket.emit("join", user.id);

    const handleMessage = (data) => {
      if (data.senderId !== user.id) {
    appendMessage(data.senderId, data); // senderId = activeChatId in 1-1
    const sender = users.find(u => u._id === data.senderId);
    toast.info(`New message from ${sender ? sender.username : "Unknown"}: ${data.message}`);
  }
    };

    socket.on("getMessage", handleMessage);

    return () => {
      socket.off("getMessage", handleMessage); 
    };
}, [users]); 


  useEffect(() => {
    const fetchUsers = async () => {
      const res = await axios.get("http://localhost:5000/api/auth/users");
      const filtered = res.data.filter((u) => u._id !== user.id);
      setUsers(filtered);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      const res = await axios.get(
        `http://localhost:5000/api/group/all/${user.id}`
      );
      setGroups(res.data);
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      socket.emit("joinGroup", selectedGroup);
    }
  }, [selectedGroup]);
  useEffect(() => {
    socket.on("getGroupMessage", (data) => {
      appendMessage(data.groupId, data);
      if (data.senderId !== user.id) {
        const group = groups.find(g => g._id === data.groupId);
        toast.info(`New message in group ${group ? group.name : "Unknown"}: ${data.message}`);
      }
    });

    return () => socket.off("getGroupMessage");
  }, [selectedGroup]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newMessage = {
      senderId: user.id,
      message,
      groupId: selectedGroup,
    };

    if (selectedGroup) {
      // ✅ Only send to server; don't push locally to avoid duplication
      socket.emit("sendGroupMessage", newMessage);
    } else {
      // ✅ Push local + emit for private message
      appendMessage(getActiveChatId(), newMessage);
      socket.emit("sendMessage", {
        senderId: user.id,
        receiverId: receiver,
        message,
      });
    }

    // Save to DB in both cases
    await axios.post("http://localhost:5000/api/message", {
      sender: user.id,
      receiver: selectedGroup || receiver,
      content: message,
    });

    setMessage("");
  };

  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji.native);
  };

  const filteredChat = chat.filter((msg) =>
    msg.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGroup = async () => {
    if (!groupName || selectedMembers.length === 0) {
      toast.warn("Please enter group name and select members");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/group/create", {
        name: groupName,
        members: [user.id, ...selectedMembers],
      });

      setGroups((prev) => [...prev, res.data]);
      toast.success("Group created!");
      setShowCreateModal(false);
      setGroupName("");
      setSelectedMembers([]);
    } catch (error) {
      toast.error("Error creating group");
      console.error(error);
    }
  };

  const getUsername = (id) => {
    if (id === user.id) return "You";
    const found = users.find(u => u._id === id);
    return found ? found.username : "Unknown";
  };

  const getActiveChatId = () => selectedGroup || receiver;

  const currentChatMessages = chatMap[getActiveChatId()] || [];
  const appendMessage = (chatId, message) => {
  setChatMap(prev => ({
    ...prev,
    [chatId]: [...(prev[chatId] || []), message],
  }));
};



  return (
    <div className="min-h-screen w-full bg-gradient-to-tr from-blue-100 via-blue-200 to-indigo-200 flex">

  {/* Sidebar */}
  <div className="w-full md:w-1/3 lg:w-1/4 bg-white shadow-md flex flex-col p-4 gap-4">
    <h1 className="text-xl font-bold text-blue-700">👋 Welcome, {user.username}</h1>

    <button
      className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-full flex items-center justify-center gap-2"
      onClick={() => setShowCreateModal(true)}
    >
      ➕ Create Group
    </button>

    {/* User Selection */}
    <select
      className="border p-2 rounded w-full"
      value={receiver}
      onChange={(e) => setReceiver(e.target.value)}
    >
      <option value="">👤 Select a user to chat</option>
      {users.map((u) => (
        <option key={u._id} value={u._id}>
          {u.username}
        </option>
      ))}
    </select>

    {/* Group Selection */}
    <select
      className="border p-2 rounded w-full"
      value={selectedGroup}
      onChange={(e) => setSelectedGroup(e.target.value)}
    >
      <option value="">👥 Select a group</option>
      {groups.map((g) => (
        <option key={g._id} value={g._id}>
          {g.name}
        </option>
      ))}
    </select>

    {/* Search */}
    <input
      className="w-full p-2 border rounded"
      placeholder="🔍 Search messages..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>

  {/* Chat Area */}
  <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col p-4 space-y-4 relative">

    {/* Chat Box */}
    <div className="flex-grow overflow-y-auto bg-white rounded-xl shadow-inner p-4">
      {currentChatMessages.filter((msg) =>
    msg.message.toLowerCase().includes(searchTerm.toLowerCase())
  )
  .map((msg, i) => {
    const isYou = msg.senderId === user.id;
    return (
      <div
        key={i}
        className={`mb-2 flex ${isYou ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`px-3 py-2 rounded-lg max-w-xs ${
            isYou ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
          }`}
        >
          {!isYou && (
            <div className="text-xs font-semibold text-blue-700 mb-1">
              {getUsername(msg.senderId)}
            </div>
          )}
          <div className="text-sm">{msg.message}</div>
        </div>
      </div>
    );
  })}

    </div>

    {/* Emoji Picker */}
    {showEmoji && (
      <div className="absolute bottom-32 left-10 z-50 bg-white border rounded shadow-lg p-2">
        <div className="flex justify-end">
          <button
            className="text-red-500 font-bold text-lg px-2"
            onClick={() => setShowEmoji(false)}
          >
            ×
          </button>
        </div>
        <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" />
      </div>
    )}

    {/* Message Input */}
    <div className="flex items-start gap-2 w-full">
      <button onClick={() => setShowEmoji(!showEmoji)} className="text-2xl">😊</button>
      <input
        className="border p-2 rounded flex-grow focus:outline-blue-400"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message"
      />
      <button
        onClick={sendMessage}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        🚀 Send
      </button>
    </div>

    <ToastContainer position="bottom-right" autoClose={3000} />
  </div>

  {/* Modal */}
  {showCreateModal && (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-96">
        <h2 className="text-xl font-semibold text-blue-700 mb-4">Create New Group</h2>
        <input
          type="text"
          placeholder="Group Name"
          className="border p-2 w-full mb-4 rounded focus:outline-blue-400"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <div className="max-h-40 overflow-y-auto mb-4 border p-2 rounded">
          {users.map((u) => (
            <label key={u._id} className="flex items-center text-sm gap-2 mb-1">
              <input
                type="checkbox"
                value={u._id}
                checked={selectedMembers.includes(u._id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedMembers([...selectedMembers, u._id]);
                  } else {
                    setSelectedMembers(
                      selectedMembers.filter((id) => id !== u._id)
                    );
                  }
                }}
              />
              <span>{u.username}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
            onClick={() => setShowCreateModal(false)}
          >
            Cancel
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            onClick={handleCreateGroup}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )}
</div>

  );
}

export default Chat;
