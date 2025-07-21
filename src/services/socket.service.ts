import { Server as SocketIOServer, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

interface CustomSocket extends Socket {
  user?: {
    userId: string;
    sessionId: string;
  };
}

let io: SocketIOServer;

// User presence logic (no changes)
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
  console.log("✅ Socket.IO service initialized.");

  // Authentication (no changes)
  io.use((socket: CustomSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token not provided."));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        sessionId: string;
      };
      socket.user = { userId: decoded.userId, sessionId: decoded.sessionId };
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token."));
    }
  });

  io.on("connection", (socket: CustomSocket) => {
    const userId = socket.user?.userId;
    const sessionId = socket.user?.sessionId;

    if (!userId || !sessionId) {
      socket.disconnect(true);
      return;
    }

    console.log(
      `\n🟢 User Connected: Socket ID ${socket.id}, User ID ${userId}`
    );
    socket.join(userId);
    userStatuses.set(userId, { isOnline: true, lastSeen: null });
    emitUserStatusChange(userId, { isOnline: true, lastSeen: null });
    prisma.user
      .update({ where: { id: userId }, data: { lastSeen: new Date() } })
      .catch(console.error);

    // --- [CORRECTED & SIMPLIFIED] WebRTC Signaling Events ---
    socket.on("join-room", (roomId: string) => {
      if (roomId !== sessionId) {
        console.warn(
          `[AUTH_WARN] User ${userId} blocked from joining wrong room ${roomId}.`
        );
        return;
      }
      socket.join(roomId);
      console.log(`[JOIN] User ${socket.id} joined room ${roomId}`);

      const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
      const otherUsers = Array.from(clientsInRoom || []).filter(
        (id) => id !== socket.id
      );

      if (otherUsers.length > 0) {
        const otherUserSocketId = otherUsers[0];
        console.log(
          `[SIGNAL] Other user ${otherUserSocketId} found. Notifying ${socket.id} to start the call.`
        );
        socket.emit("other-user", otherUserSocketId);
      } else {
        console.log(
          `[SIGNAL] User ${socket.id} is the first in the room. Waiting...`
        );
      }
    });

    // --- All other signaling events are just relays (no changes) ---
    socket.on("offer", (payload: { target: string; offer: any }) => {
      console.log(
        `[SIGNAL] Relaying OFFER from ${socket.id} to ${payload.target}`
      );
      io.to(payload.target).emit("offer", {
        from: socket.id,
        offer: payload.offer,
      });
    });

    socket.on("answer", (payload: { target: string; answer: any }) => {
      console.log(
        `[SIGNAL] Relaying ANSWER from ${socket.id} to ${payload.target}`
      );
      io.to(payload.target).emit("answer", {
        from: socket.id,
        answer: payload.answer,
      });
    });

    socket.on(
      "ice-candidate",
      (payload: { target: string; candidate: any }) => {
        io.to(payload.target).emit("ice-candidate", {
          from: socket.id,
          candidate: payload.candidate,
        });
      }
    );

    // Notepad and Disconnect logic (no changes)
    // ...

    socket.on("disconnect", () => {
      // ... disconnect logic
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
