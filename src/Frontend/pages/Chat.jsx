import { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
      if (data.groupId === selectedGroup) {
        setChat((prev) => [...prev, data]);
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
      setChat((prev) => [...prev, newMessage]);
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <h1 className="text-xl font-semibold mb-2">Welcome, {user.username}</h1>

      <button
        className="mb-3 bg-green-600 text-white px-4 py-2 rounded"
        onClick={() => setShowCreateModal(true)}
      >
        ➕ Create Group
      </button>
      {showCreateModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-lg font-bold mb-4">Create New Group</h2>

            <input
              type="text"
              placeholder="Group Name"
              className="border p-2 w-full mb-4 rounded"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />

            <div className="max-h-40 overflow-y-scroll mb-4 border p-2 rounded">
              {users.map((u) => (
                <label key={u._id} className="block text-sm">
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
                  <span className="ml-2">{u.username}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>

              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={handleCreateGroup}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <select
        className="border p-2 rounded w-80 mb-2"
        value={receiver}
        onChange={(e) => setReceiver(e.target.value)}
      >
        <option value="">Select a user to chat with</option>
        {users.map((u) => (
          <option key={u._id} value={u._id}>
            {u.username}
          </option>
        ))}
      </select>

      <select
        className="border p-2 rounded w-80 mb-2"
        value={selectedGroup}
        onChange={(e) => setSelectedGroup(e.target.value)}
      >
        <option value="">Select a Group</option>
        {groups.map((g) => (
          <option key={g._id} value={g._id}>
            {g.name}
          </option>
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
        <button onClick={() => setShowEmoji(!showEmoji)} className="text-xl">
          😊
        </button>
        {showEmoji && (
          <div className="absolute z-10 bg-white border rounded shadow-md p-2">
            {/* Close Button */}
            <div className="flex justify-end">
              <button
                className="text-red-500 font-bold text-lg px-2"
                onClick={() => setShowEmoji(false)}
              >
                ×
              </button>
            </div>

            {/* Emoji Picker */}
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
