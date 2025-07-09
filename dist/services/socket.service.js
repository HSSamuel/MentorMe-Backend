"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = void 0;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";
const initializeSocket = (io) => {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: Token not provided."));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            socket.user = decoded;
            next();
        }
        catch (err) {
            next(new Error("Authentication error: Invalid token."));
        }
    });
    io.on("connection", (socket) => {
        console.log(`🟢 User connected: ${socket.id}`);
        const user = socket.user;
        socket.join(user.userId);
        socket.on("joinConversation", (conversationId) => {
            socket.join(conversationId);
            console.log(`User ${user.userId} joined conversation ${conversationId}`);
        });
        socket.on("sendMessage", (data) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                const { conversationId, content } = data;
                const message = yield prisma.message.create({
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
                const recipient = message.conversation.participants.find((p) => p.id !== user.userId);
                if (recipient) {
                    const notification = yield prisma.notification.create({
                        data: {
                            userId: recipient.id,
                            type: "NEW_MESSAGE",
                            message: `You have a new message from ${((_a = message.sender.profile) === null || _a === void 0 ? void 0 : _a.name) || "a user"}.`,
                            link: `/messages`,
                        },
                    });
                    // Emit a real-time event to the recipient's personal room
                    io.to(recipient.id).emit("newNotification", notification);
                }
            }
            catch (error) {
                console.error("Error sending message:", error);
                socket.emit("messageError", { message: "Could not send message." });
            }
        }));
        // Listen for goal completion
        socket.on("goalCompleted", (data) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const { goalId, menteeId, mentorId } = data;
            const mentee = yield prisma.user.findUnique({
                where: { id: menteeId },
                include: { profile: true },
            });
            if (mentee) {
                const notification = yield prisma.notification.create({
                    data: {
                        userId: mentorId,
                        type: "GOAL_COMPLETED",
                        message: `${((_a = mentee.profile) === null || _a === void 0 ? void 0 : _a.name) || "A mentee"} has completed a goal!`,
                        link: `/mentors`, // Or a more specific link
                    },
                });
                io.to(mentorId).emit("newNotification", notification);
            }
        }));
        // Listen for availability updates
        socket.on("availabilityUpdated", (data) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const { mentorId } = data;
            const mentor = yield prisma.user.findUnique({
                where: { id: mentorId },
                include: { profile: true },
            });
            if (mentor) {
                const mentees = yield prisma.mentorshipRequest.findMany({
                    where: { mentorId, status: "ACCEPTED" },
                    select: { menteeId: true },
                });
                for (const mentee of mentees) {
                    const notification = yield prisma.notification.create({
                        data: {
                            userId: mentee.menteeId,
                            type: "AVAILABILITY_UPDATED",
                            message: `${((_a = mentor.profile) === null || _a === void 0 ? void 0 : _a.name) || "A mentor"} has updated their availability.`,
                            link: `/book-session/${mentorId}`,
                        },
                    });
                    io.to(mentee.menteeId).emit("newNotification", notification);
                }
            }
        }));
        socket.on("disconnect", () => {
            console.log(`🔴 User disconnected: ${socket.id}`);
        });
    });
};
exports.initializeSocket = initializeSocket;
