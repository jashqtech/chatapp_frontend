import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "./App.css";

const socket = io("https://chatapp-backend-1-2yt9.onrender.com");

const validUsers = [
  { username: "jash", password: "123", avatar: "https://i.pravatar.cc/150?img=1" },
  { username: "het", password: "123", avatar: "https://i.pravatar.cc/150?img=2" },
  { username: "meet", password: "123", avatar: "https://i.pravatar.cc/150?img=3" },
  { username: "new", password: "123", avatar: "https://i.pravatar.cc/150?img=4" }
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
  const chatEndRef = useRef(null);

  const availableUsers = [...validUsers.map(u => u.username), "Garba Ghela"]
    .filter(user => user !== username);

  useEffect(() => {
    socket.on("group_message", (data) => {
      setChatLog(prev => [...prev, {
        from: data.sender,
        to: "group",
        text: data.message,
        timestamp: data.timestamp
      }]);
    });
    socket.on("private_message", (data) => {
      setChatLog(prev => [...prev, {
        from: data.sender,
        to: data.receiver,
        text: data.message,
        timestamp: data.timestamp
      }]);
    });

    socket.on("error_message", (data) => {
      setChatLog(prev => [...prev, { from: "system", text: data.error }]);
    });

    socket.on("user_online_status", (data) => {
      setOnlineUsers(data);
    });

    socket.on("typing", (data) => {
      if (data.sender !== username && data.receiver === username) {
        setTypingUser(data.sender);
        setTimeout(() => setTypingUser(""), 1500);
      }

    }
  
  );

    return () => {
      socket.off("private_message");
      socket.off("error_message");
      socket.off("user_online_status");
      socket.off("typing");
    };
  }, [username]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, typingUser]);

  const handleLogin = (e) => {
    e.preventDefault();
    const user = validUsers.find(u => u.username === username && u.password === password);
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
    const timestamp = new Date().toLocaleTimeString();
    const isGroup = selectedUser === "Garba Ghela";
  
    socket.emit("private_message", {
      sender: username,
      receiver: isGroup ? "group" : selectedUser,
      message: message.trim(),
      timestamp
    });
  
    setChatLog(prev => [...prev, {
      from: username,
      to: isGroup ? "group" : selectedUser,
      text: message.trim(),
      timestamp
    }]);
  
    setMessage("");
  };

  const handleTyping = () => {
    if (selectedUser && selectedUser !== "Garba Ghela") {
      socket.emit("typing", { sender: username, receiver: selectedUser });
    }
  };

  const backToUsers = () => setSelectedUser("");

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
    <div className={`app-container ${selectedUser ? "chat-open" : ""}`}>
      {!selectedUser && (
        <aside className="sidebar">
          <h3>Users</h3>
          <ul>
            {availableUsers.map(user => (
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
      )}

      {selectedUser && (
        <div className="chat-area">
          <header className="chat-header">
            <button className="back-button" onClick={backToUsers}>←</button>
            <h2>
              {selectedUser}
              <span className={`status-dot ${onlineUsers[selectedUser] ? "online" : "offline"}`}></span>
            </h2>
          </header>

          <div className="chat-box">
            {chatLog
              .filter(msg =>
                (msg.from === username && msg.to === selectedUser) ||
                (msg.from === selectedUser && msg.to === username) ||
                (selectedUser === "Garba Ghela" && msg.to === "group") ||
                msg.from === "system"
              )
              .map((msg, idx) => {
                const senderData = validUsers.find(u => u.username === msg.from);
                return (
                  <div
                    key={idx}
                    className={`chat-message ${
                      msg.from === username ? "sent" : msg.from === "system" ? "system" : "received"
                    }`}
                  >
                    {msg.from !== "system" && (
                      <div className="message-meta">
                        <img className="avatar" src={senderData?.avatar} alt={msg.from} />
                        <div className="meta-text">
                          <span className="sender-name">{msg.from}</span>
                          <span className="time">{msg.timestamp}</span>
                        </div>
                      </div>
                    )}
                    <p>{msg.text}</p>
                  </div>
                );
              })}
            {typingUser && <p className="typing">{typingUser} is typing...</p>}
            <div ref={chatEndRef} />
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
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
