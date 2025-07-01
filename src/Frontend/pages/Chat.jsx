import { useEffect, useState, useCallback } from "react";
import io from "socket.io-client";
import axios from "axios";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import v2 from "../../assets/v2.mp4";

const socket = io("http://localhost:5000");

function Chat() {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  
  const [message, setMessage] = useState("");
  const [receiver, setReceiver] = useState("");
  const [users, setUsers] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [chatMap, setChatMap] = useState({});
  const [userMap, setUserMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasSelectedChat, setHasSelectedChat] = useState(false);

  // Initialize user and data
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!user) {
          const stored = sessionStorage.getItem("user");
          if (stored) {
            setUser(JSON.parse(stored));
          } else {
            console.error("No user found in session storage");
            return;
          }
        }

        // Fetch users and create user map
        const usersRes = await axios.get("http://localhost:5000/api/auth/users");
        const filtered = usersRes.data.filter((u) => u._id !== user.id);
        setUsers(filtered);

        const map = {};
        filtered.forEach(u => {
          map[u._id] = u.username;
        });
        map[user.id] = "You";
        setUserMap(map);

        // Fetch groups
        const groupsRes = await axios.get(
          `http://localhost:5000/api/group/all/${user.id}`
        );
        setGroups(groupsRes.data);

        setIsLoading(false);
      } catch (error) {
        console.error("Initialization error:", error);
        toast.error("Failed to load chat data");
      }
    };

    initialize();
  }, [user]);

  // Socket setup
  useEffect(() => {
    if (!user) return;

    socket.emit("join", user.id);

    const handleMessage = (data) => {
      if (data.senderId !== user.id) {
        appendMessage(data.senderId, data);
        const sender = userMap[data.senderId] || "User";
        toast.info(`New message from ${sender}: ${data.message}`);
      }
    };

    const handleGroupMessage = (data) => {
      appendMessage(data.groupId, data);
      if (data.senderId !== user.id) {
        const group = groups.find(g => g._id === data.groupId);
        toast.info(`New message in group ${group ? group.name : "Group"}: ${data.message}`);
      }
    };

    socket.on("getMessage", handleMessage);
    socket.on("getGroupMessage", handleGroupMessage);

    return () => {
      socket.off("getMessage", handleMessage);
      socket.off("getGroupMessage", handleGroupMessage);
    };
  }, [user, userMap, groups]);

  // Join group when selected
  useEffect(() => {
    if (selectedGroup) {
      socket.emit("joinGroup", selectedGroup);
    }
  }, [selectedGroup]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newMessage = {
      senderId: user.id,
      message,
      groupId: selectedGroup,
    };

    try {
      if (selectedGroup) {
        socket.emit("sendGroupMessage", newMessage);
      } else {
        if (!receiver) {
          toast.warn("Please select a recipient first");
          return;
        }
        appendMessage(getActiveChatId(), newMessage);
        socket.emit("sendMessage", {
          senderId: user.id,
          receiverId: receiver,
          message,
        });
      }

      await axios.post("http://localhost:5000/api/message", {
        sender: user.id,
        receiver: selectedGroup || receiver,
        content: message,
      });

      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji.native);
  };

  const getUsername = useCallback((id) => {
  if (!id) return "System";
  if (id === user?.id) return "You";
  return userMap[id] || "User";
}, [userMap, user?.id]);
  const getActiveChatId = () => selectedGroup || receiver;

  const currentChatMessages = chatMap[getActiveChatId()] || [];

  const appendMessage = useCallback((chatId, message) => {
    setChatMap(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), message],
    }));
  }, []);

  // Fetch messages when receiver or group changes
  useEffect(() => {
  const fetchMessages = async () => {
    const chatId = selectedGroup || receiver;
    if (!chatId) {
      setHasSelectedChat(false);
      return;
    }

    setHasSelectedChat(true);
    
    try {
      const url = selectedGroup
        ? `http://localhost:5000/api/message/group/${chatId}`
        : `http://localhost:5000/api/message/private/${user.id}/${receiver}`;
      
      const res = await axios.get(url);
      
      // Transform the API response to match expected format
      const transformedMessages = res.data.map(msg => ({
        senderId: msg.sender,
        receiverId: msg.receiver,
        message: msg.content,
        createdAt: msg.createdAt,
        _id: msg._id
      }));

      setChatMap(prev => ({
        ...prev,
        [chatId]: transformedMessages,
      }));
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      toast.error("Failed to load messages");
    }
  };

  fetchMessages();
}, [receiver, selectedGroup, user]);


  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-6 text-center text-xl">🔄 Loading chat...</div>
      </div>
    );
  }

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
          onChange={(e) => {
            setReceiver(e.target.value);
            setSelectedGroup("");
          }}
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
          onChange={(e) => {
            setSelectedGroup(e.target.value);
            setReceiver("");
          }}
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
          {!hasSelectedChat ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-gray-500 text-center">
                <p className="text-lg">👋 Welcome to the chat!</p>
                <p className="text-sm">Select a user or group to start chatting</p>
              </div>
            </div>
          ) : currentChatMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-gray-500">
                No messages yet. Start the conversation!
              </div>
            </div>
          ) : (currentChatMessages
  .filter((msg) =>
    (msg?.message || msg?.content || "").toLowerCase().includes(searchTerm.toLowerCase())
  )
  .map((msg, i) => {
    const senderId = msg.senderId || msg.sender;
    const isYou = senderId === user.id;
    const messageContent = msg.message || msg.content;
    
    return (
      <div
        key={msg._id || i}
        className={`mb-2 flex ${isYou ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`px-3 py-2 rounded-lg max-w-xs ${
            isYou ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
          }`}
        >
          {!isYou && (
            <div className="text-xs font-semibold text-blue-700 mb-1">
              {getUsername(senderId)}
            </div>
          )}
          <div className="text-sm">{messageContent}</div>
        </div>
      </div>
    );
  })
)}
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
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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

      {/* Group Creation Modal */}
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