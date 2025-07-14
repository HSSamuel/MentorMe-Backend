import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { getUserId } from "../utils/getUserId";

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

          io.to(conversationId).emit("receiveMessage", message);

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
            io.to(recipient.id).emit("newNotification", notification);
          }
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("messageError", { message: "Could not send message." });
        }
      }
    );

    socket.on(
      "goalCompleted",
      async (data: { goalId: string; menteeId: string; mentorId: string }) => {
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
              link: `/mentors`,
            },
          });
          io.to(mentorId).emit("newNotification", notification);
        }
      }
    );

    socket.on("availabilityUpdated", async (data: { mentorId: string }) => {
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
          io.to(mentee.menteeId).emit("newNotification", notification);
        }
      }
    });

    // --- WebRTC Signaling Events ---
    socket.on("join-room", (roomId: string) => {
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", socket.id);
    });

    socket.on("offer", (payload: { target: string; offer: any }) => {
      io.to(payload.target).emit("offer", {
        socketId: socket.id,
        offer: payload.offer,
      });
    });

    socket.on("answer", (payload: { target: string; answer: any }) => {
      io.to(payload.target).emit("answer", {
        socketId: socket.id,
        answer: payload.answer,
      });
    });

    socket.on(
      "ice-candidate",
      (payload: { target: string; candidate: any }) => {
        io.to(payload.target).emit("ice-candidate", {
          socketId: socket.id,
          candidate: payload.candidate,
        });
      }
    );

    socket.on("disconnect", () => {
      console.log(`🔴 User disconnected: ${socket.id}`);
      // Notify other users in the rooms that this user was in
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.to(room).emit("user-left", socket.id);
        }
      });
    });
  });
};
