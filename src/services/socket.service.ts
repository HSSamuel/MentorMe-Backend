import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

interface SocketUser {
  userId: string;
}

export const initializeSocket = (io: Server) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token not provided."));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token."));
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log(`🟢 User connected: ${socket.id}`);
    const user = (socket as any).user as SocketUser;

    socket.join(user.userId);

    socket.on("joinConversation", (conversationId: string) => {
      socket.join(conversationId);
      console.log(`User ${user.userId} joined conversation ${conversationId}`);
    });

    socket.on(
      "sendMessage",
      async (data: { conversationId: string; content: string }) => {
        try {
          const { conversationId, content } = data;

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

          // Broadcast the new message to all clients in the conversation room
          io.to(conversationId).emit("receiveMessage", message);

          // --- Create and Push Notification for the Recipient ---
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
                link: `/messages`,
              },
            });
            // Emit a real-time event to the recipient's personal room
            io.to(recipient.id).emit("newNotification", notification);
          }
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("messageError", { message: "Could not send message." });
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`🔴 User disconnected: ${socket.id}`);
    });
  });
};
