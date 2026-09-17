const jwt = require("jsonwebtoken");

function registerMessageSocket(io) {
  // Authenticate socket connections using the same JWT as HTTP
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const { gymId, userId } = socket.user || {};

    if (gymId) {
      // Rooms are scoped per gym so messages stay isolated
      socket.join(`gym:${gymId}`);
    }

    socket.on("join-conversation", ({ partnerId }) => {
      if (!gymId || !userId || !partnerId) return;
      const roomId = `gym:${gymId}:${[userId, partnerId].sort().join(":")}`;
      socket.join(roomId);
      socket.currentRoom = roomId;
    });

    socket.on("send-message", (message) => {
      if (!socket.currentRoom) return;
      io.to(socket.currentRoom).emit("new-message", message);
    });

    socket.on("mark-read", ({ conversationRoom }) => {
      if (!conversationRoom) return;
      socket.to(conversationRoom).emit("messages-read", { by: userId });
    });
  });
}

module.exports = { registerMessageSocket };
