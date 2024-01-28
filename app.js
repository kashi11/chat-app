const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const users = {};
const messageHistory = {};

const getLast10MessagesInRoom = (room) => {
  return messageHistory[room].slice(0, 10);
};

io.on("connection", (socket) => {
  socket.on("joinRoom", (room, username) => {
    users[socket.id] = { username, room };
    socket.join(room);
    socket.to(room).broadcast.emit("userJoined", username);
    const last10MesagesInRoom = getLast10MessagesInRoom(room);
    socket.emit("messageHistory", last10MesagesInRoom);
  });

  socket.on("disconnect", () => {
    if (users[socket.id]) {
      const { username, room } = users[socket.id];
      socket.to(room).broadcast.emit("userLeft", username);
      delete users[socket.id];
    }
  });

  socket.on("sendMessage", (message) => {
    const { room } = users[socket.id];
    messageHistory[room] = [message, ...messageHistory[room]];
    io.to(room).emit("message", {
      sender: users[socket.id].username,
      text: message,
      timestamp: new Date().getTime(),
    });
  });

  socket.on("typing", () => {
    socket
      .to(users[socket.id].room)
      .broadcast.emit("userTyping", users[socket.id].username);
  });

  socket.on("stopTyping", () => {
    socket
      .to(users[socket.id].room)
      .broadcast.emit("userStoppedTyping", users[socket.id].username);
  });

  socket.on("privateMessage", ({ recipient, message }) => {
    const recipientSocket = Object.keys(users).find(
      (socketId) => users[socketId].username === recipient
    );

    if (recipientSocket) {
      io.to(recipientSocket).emit("privateMessage", {
        sender: users[socket.id].username,
        text: message,
        timestamp: new Date().getTime(),
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
