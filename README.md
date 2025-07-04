# 💬 ChatSphere

**ChatSphere** is a full-stack real-time chat application built with React, Node.js, Express, MongoDB, and Socket.IO. It supports both private messaging and group chats with persistent chat history, emoji support, and modern UI design.

---

## 🚀 Features

- 🔐 User authentication (login/register)
- 💬 Private one-to-one chat
- 👥 Group chat with multiple users
- 🧠 Real-time messaging using Socket.IO
- 📦 Chat history persistence in MongoDB
- 😀 Emoji support using `emoji-mart`
- 🔍 Message search/filter in chat window
- ⚡ Toast notifications for new messages
- 🔄 Persist selected chat (even after refresh)

---

## 🧱 Tech Stack

### Frontend:
- React.js
- TailwindCSS
- Socket.IO Client
- Axios
- Emoji Mart
- React Toastify

### Backend:
- Node.js
- Express.js
- MongoDB (with Mongoose)
- Socket.IO
- Bcrypt (for password hashing)
- JSON Web Tokens (JWT)

---

## 🖼️ UI Preview

| Private Chat | Group Chat | Emoji Picker |
|--------------|------------|--------------|
| ![private-chat](images/preview1.png) | ![group-chat](docs/preview2.png) | ![emoji-picker](docs/preview3.png) |

---

## 🛠️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/chatsphere.git
cd chatsphere
