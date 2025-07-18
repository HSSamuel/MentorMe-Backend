import { Server as SocketIOServer, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

// This interface adds the 'user' property to the Socket object for type safety.
interface CustomSocket extends Socket {
  user?: {
    userId: string;
  };
}

let io: SocketIOServer;

const userStatuses = new Map<
  string,
  { isOnline: boolean; lastSeen: Date | null }
>();

const emitUserStatusChange = (
  userId: string,
  status: { isOnline: boolean; lastSeen: Date | null }
) => {
  if (io) {
    io.emit("userStatusChange", { userId, ...status });
  }
};

export const initializeSocket = (ioInstance: SocketIOServer) => {
  io = ioInstance;

  // --- Authentication Middleware for all incoming socket connections ---
  io.use((socket: CustomSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token not provided."));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      socket.user = { userId: decoded.userId }; // Attach user info to the socket
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token."));
    }
  });

  // --- Single, Unified Connection Handler ---
  io.on("connection", (socket: CustomSocket) => {
    // This 'userId' is now correctly scoped and accessible to all event handlers below.
    const userId = socket.user?.userId;

    if (!userId) {
      console.error(`Socket ${socket.id} connected without a valid user ID.`);
      socket.disconnect(true);
      return;
    }

    console.log(`🟢 User connected: ${socket.id} | UserID: ${userId}`);

    // --- User Presence and Status Handling ---
    socket.join(userId); // Join a personal room for direct notifications
    userStatuses.set(userId, { isOnline: true, lastSeen: null });
    emitUserStatusChange(userId, { isOnline: true, lastSeen: null });
    prisma.user
      .update({ where: { id: userId }, data: { lastSeen: new Date() } })
      .catch(console.error);

    // --- WebRTC Signaling Events ---
    socket.on("join-room", (roomId: string) => {
      socket.join(roomId);
      const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
      const otherUsers = Array.from(clientsInRoom || []).filter(
        (id) => id !== socket.id
      );

      if (otherUsers.length > 0) {
        const otherUserSocketId = otherUsers[0];
        socket.emit("other-user", otherUserSocketId);
      }
    });

    socket.on(
      "offer",
      (payload: { target: string; offer: RTCSessionDescriptionInit }) => {
        io.to(payload.target).emit("offer", {
          from: socket.id,
          offer: payload.offer,
        });
      }
    );

    socket.on(
      "answer",
      (payload: { target: string; answer: RTCSessionDescriptionInit }) => {
        io.to(payload.target).emit("answer", {
          from: socket.id,
          answer: payload.answer,
        });
      }
    );

    socket.on(
      "ice-candidate",
      (payload: { target: string; candidate: RTCIceCandidateInit }) => {
        io.to(payload.target).emit("ice-candidate", {
          from: socket.id,
          candidate: payload.candidate,
        });
      }
    );

    // --- Disconnect Handler ---
    socket.on("disconnect", () => {
      // 'userId' is correctly accessed from the parent scope here.
      console.log(`🔴 User disconnected: ${socket.id} | UserID: ${userId}`);
      const lastSeenTime = new Date();
      userStatuses.set(userId, { isOnline: false, lastSeen: lastSeenTime });
      emitUserStatusChange(userId, { isOnline: false, lastSeen: lastSeenTime });
      prisma.user
        .update({ where: { id: userId }, data: { lastSeen: lastSeenTime } })
        .catch(console.error);

      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.to(room).emit("user-left", socket.id);
        }
      });
    });
  });
};

export const getIo = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.IO server not initialized.");
  }
  return io;
};
