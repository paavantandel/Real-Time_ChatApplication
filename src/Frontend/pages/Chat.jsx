import { useEffect, useState, useCallback } from "react";
import io from "socket.io-client";
import axios from "axios";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRef } from "react";

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
  const messagesEndRef = useRef(null);
  // Fetch user, users, groups
  useEffect(() => {
    const initialize = async () => {
      try {
        const stored = sessionStorage.getItem("user");
        const parsedUser = stored ? JSON.parse(stored) : null;
        if (!parsedUser) return;

        setUser(parsedUser);

        const usersRes = await axios.get("http://localhost:5000/api/auth/users");
        const filtered = usersRes.data.filter((u) => u._id !== parsedUser.id);
        setUsers(filtered);

        const map = {};
        filtered.forEach((u) => {
          map[u._id] = u.username;
        });
        map[parsedUser.id] = "You";
        setUserMap(map);

        const groupsRes = await axios.get(`http://localhost:5000/api/group/all/${parsedUser.id}`);
        setGroups(groupsRes.data);

        setIsLoading(false);
      } catch (error) {
        console.error("Initialization error:", error);
        toast.error("Failed to load chat data");
      }
    };

    initialize();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!user) return;

    socket.emit("join", user.id);

    const handleMessage = (data) => {
  const activeChatId = selectedGroup || receiver;

  const chatId =
    data.groupId || // For group messages (if any)
    (data.senderId === user.id ? data.receiverId : data.senderId); // For private

  // Display in UI
  appendMessage(chatId, data);

  // Optional toast
  if (data.senderId !== user.id) {
    const sender = userMap[data.senderId] || "User";
    toast.info(`New message from ${sender}: ${data.message}`);
  }
};


    const handleGroupMessage = (data) => {
    appendMessage(data.groupId, data);
    if (data.senderId !== user.id) {
      const group = groups.find((g) => g._id === data.groupId);
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

  // Join socket room for group
  useEffect(() => {
    if (selectedGroup) {
      socket.emit("joinGroup", selectedGroup);
    }
  }, [selectedGroup]);

  // Send message (private or group)
  const sendMessage = async () => {
    if (!message.trim()) return;

    const isGroup = Boolean(selectedGroup);
    const chatId = isGroup ? selectedGroup : receiver;

    if (!chatId) {
      toast.warn("Please select a recipient first");
      return;
    }

    const newMessage = {
      senderId: user.id,
      receiverId: isGroup ? null : receiver,
      groupId: isGroup ? selectedGroup : null,
      message,
    };

    try {
      // Emit socket
      isGroup
        ? socket.emit("sendGroupMessage", newMessage)
        : socket.emit("sendMessage", newMessage);

      // Optimistic UI update
      // appendMessage(chatId, newMessage);

      // Save to DB
      await axios.post("http://localhost:5000/api/message", {
        sender: user.id,
        receiver: isGroup ? null : receiver,
        groupId: isGroup ? selectedGroup : null,
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

  const getUsername = useCallback(
    (id) => {
      if (!id) return "System";
      if (id === user?.id) return "You";
      return userMap[id] || "User";
    },
    [userMap, user?.id]
  );

  const getActiveChatId = () => selectedGroup || receiver;

  const currentChatMessages = chatMap[getActiveChatId()] || [];

  const appendMessage = useCallback((chatId, message) => {
    setChatMap((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), message],
    }));
  }, []);

  // Fetch messages on chat change
  useEffect(() => {
    const fetchMessages = async () => {
      const chatId = getActiveChatId();
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

        const transformed = res.data.map((msg) => ({
          senderId: msg.sender,
          receiverId: msg.receiver,
          message: msg.content,
          createdAt: msg.createdAt,
          _id: msg._id,
        }));

        setChatMap((prev) => ({
          ...prev,
          [chatId]: transformed,
        }));
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
        toast.error("Failed to load messages");
      }
    };

    fetchMessages();
  }, [receiver, selectedGroup, user]);

  const handleCreateGroup = async () => {
    if (!groupName || selectedMembers.length === 0) {
      toast.warn("Group name and members are required");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/group/create", {
        name: groupName,
        members: [user.id, ...selectedMembers],
      });

      setGroups((prev) => [...prev, res.data]);
      setShowCreateModal(false);
      setGroupName("");
      setSelectedMembers([]);
      toast.success("Group created!");
    } catch (err) {
      console.error("Failed to create group:", err);
      toast.error("Group creation failed");
    }
  };
  useEffect(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }
}, [currentChatMessages]);

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-6 text-center text-xl">🔄 Loading chat...</div>
      </div>
    );
  }

  const handleLogout = () => {
  socket.disconnect(); // 👈 Explicitly disconnect from server
  sessionStorage.removeItem("user");
  window.location.href = "/";
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
        <button
          className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-full flex items-center justify-center gap-2"
          onClick={handleLogout}
        >
          🚪 Logout
        </button>

        {/* User Selection */}

        {/* Users List */}
<div className="mt-6">
  <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2 pl-2">Active Users</h2>
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="max-h-60 overflow-y-auto">
      {users.map((u) => (
        <button
          key={u._id}
          onClick={() => {
            setReceiver(u._id);
            setSelectedGroup("");
          }}
          className={`flex items-center w-full px-4 py-3 text-sm transition-colors ${
            receiver === u._id
              ? "bg-blue-50 border-l-4 border-blue-500"
              : "hover:bg-gray-50 border-l-4 border-transparent"
          }`}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
            {u.username.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <p className={`font-medium ${
              receiver === u._id ? "text-blue-800" : "text-gray-800"
            }`}>
              {u.username}
            </p>
            <p className={`text-xs ${
              receiver === u._id ? "text-blue-600" : "text-gray-500"
            }`}>
            </p>
          </div>
        </button>
      ))}
    </div>
  </div>
</div>

{/* Groups List */}
<div className="mt-6">
  <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2 pl-2">Group Chats</h2>
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="max-h-60 overflow-y-auto">
      {groups.map((g) => (
        <button
          key={g._id}
          onClick={() => {
            setSelectedGroup(g._id);
            setReceiver("");
          }}
          className={`flex items-center w-full px-4 py-3 text-sm transition-colors ${
            selectedGroup === g._id
              ? "bg-green-50 border-l-4 border-green-500"
              : "hover:bg-gray-50 border-l-4 border-transparent"
          }`}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 013.75-2.906z" />
            </svg>
          </div>
          <div className="text-left">
            <p className={`font-medium ${
              selectedGroup === g._id ? "text-green-800" : "text-gray-800"
            }`}>
              {g.name}
            </p>
            <p className={`text-xs ${
              selectedGroup === g._id ? "text-green-600" : "text-gray-500"
            }`}>
              {g.members.length} members
            </p>
          </div>
        </button>
      ))}
    </div>
  </div>
</div>

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
        <div className="h-[600px] overflow-y-auto bg-white rounded-xl shadow-inner p-4">
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
          ) : (
            currentChatMessages
              .filter((msg) =>
                (msg.message || "").toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((msg, i) => {
                const senderId = msg.senderId;
                const isYou = senderId === user.id;
                return (
                  <div
                    key={msg._id || i}
                    className={`mb-2 flex ${isYou ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`px-3 py-2 rounded-lg max-w-xs ${
                        isYou ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
                      }`}
                    >
                      {!isYou && (
                        <div className="text-xs font-semibold text-blue-700 mb-1">
                          {getUsername(senderId)}
                        </div>
                      )}
                      <div className="text-sm">{msg.message}</div>
                    </div>
                  </div>
                );
              })
          )}
          <div ref={messagesEndRef}></div>
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
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
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
                      const checked = e.target.checked;
                      setSelectedMembers((prev) =>
                        checked
                          ? [...prev, u._id]
                          : prev.filter((id) => id !== u._id)
                      );
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
