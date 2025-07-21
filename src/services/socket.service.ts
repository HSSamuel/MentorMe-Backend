import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

// Use a simpler socket type as we only need the user's ID
interface CustomSocket extends Socket {
  user?: { userId: string };
}

let io: SocketIOServer;

export const initializeSocket = (ioInstance: SocketIOServer) => {
  io = ioInstance;
  console.log("✅ Real-time data socket service initialized.");

  // Use the main application's JWT for authentication
  // This token is different from the Twilio video token
  io.use((socket: CustomSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token not provided."));
    }
    try {
      // We only need the userId from the standard app token
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      socket.user = { userId: decoded.userId };
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token."));
    }
  });

  io.on("connection", (socket: CustomSocket) => {
    const userId = socket.user?.userId;
    if (!userId) {
      return socket.disconnect(true);
    }

    console.log(
      `\n🟢 Data socket connected: Socket ID ${socket.id}, User ID ${userId}`
    );

    // --- Event Handlers for Data Features ---

    // Allows the client to join a specific room for chat and notepad updates
    socket.on("join-data-room", (roomId: string) => {
      socket.join(roomId);
      console.log(`[Data] User ${socket.id} joined data room ${roomId}`);
    });

    // Handles real-time updates for the shared notepad
    socket.on("notepad-change", (data: { roomId: string; content: string }) => {
      // Broadcast the change to everyone else in the room
      socket.to(data.roomId).emit("notepad-update", data.content);
    });

    // Handles sending and receiving real-time chat messages
    socket.on(
      "send-chat-message",
      (data: { roomId: string; message: string; senderName: string }) => {
        // Broadcast the message to everyone else in the room
        socket.to(data.roomId).emit("new-chat-message", {
          message: data.message,
          senderName: data.senderName,
          socketId: socket.id, // Identify the sender
        });
      }
    );

    socket.on("disconnect", () => {
      console.log(`\n🔴 Data socket disconnected: Socket ID ${socket.id}`);
    });
  });
};
