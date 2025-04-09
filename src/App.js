import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:4000");

const validUsers = [
  { username: "alice", password: "123" },
  { username: "bob", password: "123" },
  { username: "charlie", password: "123" }
];

const App = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [onlineUsers, setOnlineUsers] = useState({});

  const availableUsers = validUsers
    .filter((u) => u.username !== username)
    .map((u) => u.username);

  useEffect(() => {
    socket.on("private_message", (data) => {
      setChatLog((prev) => [...prev, {
        from: data.sender,
        to: data.receiver,
        text: data.message
      }]);
    });

    socket.on("error_message", (data) => {
      setChatLog((prev) => [...prev, { from: "system", text: data.error }]);
    });

    socket.on("user_online_status", (data) => {
      setOnlineUsers(data);
    });

    socket.on("typing", (data) => {
      if (data.sender !== username && data.receiver === username) {
        setTypingUser(data.sender);
        setTimeout(() => setTypingUser(""), 1500);
      }
    });

    return () => {
      socket.off("private_message");
      socket.off("error_message");
      socket.off("user_online_status");
      socket.off("typing");
    };
  }, [username]);

  const handleLogin = (e) => {
    e.preventDefault();
    const user = validUsers.find(
      (u) => u.username === username && u.password === password
    );
    if (user) {
      setLoggedIn(true);
      setLoginError("");
      socket.emit("register", username);
    } else {
      setLoginError("Invalid username or password");
    }
  };

  const sendPrivateMessage = () => {
    if (!selectedUser || message.trim() === "") return;
    socket.emit("private_message", {
      sender: username,
      receiver: selectedUser,
      message: message.trim()
    });
    setChatLog((prev) => [...prev, {
      from: username,
      to: selectedUser,
      text: message.trim()
    }]);
    setMessage("");
  };

  const handleTyping = () => {
    if (selectedUser) {
      socket.emit("typing", { sender: username, receiver: selectedUser });
    }
  };

  if (!loggedIn) {
    return (
      <div className="login-container">
        <h2>Login</h2>
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {loginError && <p className="error">{loginError}</p>}
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h3>Users</h3>
        <ul>
          {availableUsers.map((user) => (
            <li
              key={user}
              className={selectedUser === user ? "selected" : ""}
              onClick={() => setSelectedUser(user)}
            >
              <span className={`status-dot ${onlineUsers[user] ? "online" : "offline"}`} />
              {user}
            </li>
          ))}
        </ul>
      </aside>

      <main className="chat-area">
        <header>
          <h2>{selectedUser ? `Chat with ${selectedUser}` : "Select a user"}</h2>
        </header>

        <div className="chat-box">
          {chatLog
            .filter(
              (msg) =>
                (msg.from === username && msg.to === selectedUser) ||
                (msg.from === selectedUser && msg.to === username) ||
                msg.from === "system"
            )
            .map((msg, idx) => (
              <div
                key={idx}
                className={`chat-message ${
                  msg.from === username ? "sent" : msg.from === "system" ? "system" : "received"
                }`}
              >
                <p>{msg.text}</p>
              </div>
            ))}
          {typingUser && <p className="typing">{typingUser} is typing...</p>}
        </div>

        <div className="input-box">
          <input
            type="text"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              handleTyping();
              if (e.key === "Enter") sendPrivateMessage();
            }}
          />
          <button onClick={sendPrivateMessage}>Send</button>
        </div>
      </main>
    </div>
  );
};

export default App;
