import { Server as SocketIOServer, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

// Extend the Socket interface to include the custom 'user' property.
interface CustomSocket extends Socket {
  user?: {
    userId: string;
  };
}

// Global map to store user online status and last seen timestamp
// Key: userId, Value: { isOnline: boolean, lastSeen: Date | null }
const userStatuses = new Map<
  string,
  { isOnline: boolean; lastSeen: Date | null }
>();

// Declare the 'io' instance at the module level so it's accessible to emitUserStatusChange
let io: SocketIOServer;

/**
 * Emits a user's status change to all connected clients.
 * This function now correctly accesses the module-scoped 'io' instance.
 * @param userId The ID of the user whose status changed.
 * @param status The new status object.
 */
const emitUserStatusChange = (
  userId: string,
  status: { isOnline: boolean; lastSeen: Date | null }
) => {
  if (io) {
    // Ensure io is initialized before emitting
    io.emit("userStatusChange", { userId, ...status });
    console.log(
      `Emitting status change for ${userId}: ${status.isOnline ? "Online" : "Offline"} (Last Seen: ${status.lastSeen ? status.lastSeen.toISOString() : "N/A"})`
    );
  } else {
    console.error(
      "Socket.IO 'io' instance not initialized when trying to emit user status change."
    );
  }
};

/**
 * Initializes and configures the Socket.IO server.
 * This function sets up authentication middleware for sockets and defines event listeners.
 * @param ioInstance The Socket.IO Server instance passed from the main application.
 */
export const initializeSocket = (ioInstance: SocketIOServer) => {
  // Corrected type: SocketIOServer
  io = ioInstance; // Assign the passed ioInstance to the module-scoped 'io' variable

  io.use((socket: CustomSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.warn("Socket authentication error: Token not provided.");
      return next(new Error("Authentication error: Token not provided."));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      socket.user = { userId: decoded.userId };
      next();
    } catch (err) {
      console.error("Socket authentication error: Invalid token.", err);
      next(new Error("Authentication error: Invalid token."));
    }
  });

  io.on("connection", (socket: CustomSocket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    const user = socket.user;
    if (!user || !user.userId) {
      console.error(`Socket ${socket.id} connected without a valid user ID.`);
      socket.disconnect(true);
      return;
    }

    // On connection, set user status to online
    userStatuses.set(user.userId, { isOnline: true, lastSeen: null });
    emitUserStatusChange(user.userId, userStatuses.get(user.userId)!); // Notify all clients

    // Each user joins a room identified by their userId to receive personal notifications.
    socket.join(user.userId);
    console.log(`User ${user.userId} joined personal room.`);

    /**
     * Event listener for joining a specific conversation room.
     * Clients emit this when they open a chat with a specific conversation.
     */
    socket.on("joinConversation", (conversationId: string) => {
      socket.join(conversationId);
      console.log(
        `User ${user.userId} joined conversation room: ${conversationId}`
      );
    });

    /**
     * Event listener for sending a new message.
     * This event saves the message to the database and broadcasts it.
     */
    socket.on(
      "sendMessage",
      async (data: { conversationId: string; content: string }) => {
        try {
          const { conversationId, content } = data;

          const conversationExists = await prisma.conversation.findFirst({
            where: {
              id: conversationId,
              participants: {
                some: {
                  id: user.userId,
                },
              },
            },
          });

          if (!conversationExists) {
            console.warn(
              `User ${user.userId} attempted to send message to non-existent or unauthorized conversation ${conversationId}.`
            );
            socket.emit("messageError", {
              message: "Unauthorized or conversation not found.",
            });
            return;
          }

          const message = await prisma.message.create({
            data: {
              conversationId,
              content,
              senderId: user.userId,
            },
            include: {
              sender: { include: { profile: true } },
              conversation: { include: { participants: true } },
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          io.to(conversationId).emit("receiveMessage", message); // Use the module-scoped 'io'
          console.log(
            `Message sent and broadcasted in conversation ${conversationId} by ${user.userId}.`
          );

          const recipient = message.conversation.participants.find(
            (p) => p.id !== user.userId
          );

          if (recipient) {
            const notification = await prisma.notification.create({
              data: {
                userId: recipient.id,
                type: "NEW_MESSAGE",
                message: `You have a new message from ${
                  message.sender.profile?.name || "a user"
                }.`,
                link: `/messages/${conversationId}`,
              },
            });
            io.to(recipient.id).emit("newNotification", notification); // Use the module-scoped 'io'
            console.log(
              `Notification sent to ${recipient.id} for new message.`
            );
          }
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("messageError", {
            message: "Could not send message due to a server error.",
          });
        }
      }
    );

    /**
     * Event listener for when a goal is completed.
     * This creates a notification for the mentor.
     */
    socket.on(
      "goalCompleted",
      async (data: { goalId: string; menteeId: string; mentorId: string }) => {
        try {
          const { menteeId, mentorId } = data;
          const mentee = await prisma.user.findUnique({
            where: { id: menteeId },
            include: { profile: true },
          });

          if (mentee) {
            const notification = await prisma.notification.create({
              data: {
                userId: mentorId,
                type: "GOAL_COMPLETED",
                message: `${
                  mentee.profile?.name || "A mentee"
                } has completed a goal!`,
                link: `/my-mentors`,
              },
            });
            io.to(mentorId).emit("newNotification", notification); // Use the module-scoped 'io'
            console.log(
              `Goal completion notification sent to mentor ${mentorId}.`
            );
          }
        } catch (error) {
          console.error("Error processing goal completion:", error);
          socket.emit("notificationError", {
            message: "Could not process goal completion notification.",
          });
        }
      }
    );

    /**
     * Event listener for when a mentor updates their availability.
     * This creates notifications for their associated mentees.
     */
    socket.on("availabilityUpdated", async (data: { mentorId: string }) => {
      try {
        const { mentorId } = data;
        const mentor = await prisma.user.findUnique({
          where: { id: mentorId },
          include: { profile: true },
        });

        if (mentor) {
          const mentees = await prisma.mentorshipRequest.findMany({
            where: { mentorId, status: "ACCEPTED" },
            select: { menteeId: true },
          });

          for (const mentee of mentees) {
            const notification = await prisma.notification.create({
              data: {
                userId: mentee.menteeId,
                type: "AVAILABILITY_UPDATED",
                message: `${
                  mentor.profile?.name || "A mentor"
                } has updated their availability.`,
                link: `/book-session/${mentorId}`,
              },
            });
            io.to(mentee.menteeId).emit("newNotification", notification); // Use the module-scoped 'io'
            console.log(
              `Availability update notification sent to mentee ${mentee.menteeId}.`
            );
          }
        }
      } catch (error) {
        console.error("Error processing availability update:", error);
        socket.emit("notificationError", {
          message: "Could not process availability update notification.",
        });
      }
    });

    // --- WebRTC Signaling Events ---
    socket.on("join-room", (roomId: string) => {
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", socket.id);
      console.log(`User ${socket.id} joined WebRTC room ${roomId}`);
    });

    socket.on("offer", (payload: { target: string; offer: any }) => {
      io.to(payload.target).emit("offer", {
        // Use the module-scoped 'io'
        socketId: socket.id,
        offer: payload.offer,
      });
    });

    socket.on("answer", (payload: { target: string; answer: any }) => {
      io.to(payload.target).emit("answer", {
        // Use the module-scoped 'io'
        socketId: socket.id,
        answer: payload.answer,
      });
    });

    socket.on(
      "ice-candidate",
      (payload: { target: string; candidate: any }) => {
        io.to(payload.target).emit("ice-candidate", {
          // Use the module-scoped 'io'
          socketId: socket.id,
          candidate: payload.candidate,
        });
      }
    );

    /**
     * Event listener for when a user disconnects.
     * Updates user status to offline and records last seen time.
     */
    socket.on("disconnect", () => {
      console.log(`🔴 User disconnected: ${socket.id}`);
      if (user && user.userId) {
        userStatuses.set(user.userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        emitUserStatusChange(user.userId, userStatuses.get(user.userId)!); // Notify all clients
      }
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.to(room).emit("user-left", socket.id);
        }
      });
    });
  });
};

// You can optionally export a function to get the `io` instance
// if you need to emit events from other parts of your application (e.g., REST controllers).
export const getIo = (): SocketIOServer => {
  // Corrected type: SocketIOServer
  if (!io) {
    throw new Error("Socket.IO server not initialized.");
  }
  return io;
};
