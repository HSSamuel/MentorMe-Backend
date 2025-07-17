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
exports.getIo = exports.initializeSocket = void 0;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";
// Global map to store user online status and last seen timestamp
const userStatuses = new Map();
let io;
const emitUserStatusChange = (userId, status) => {
    if (io) {
        io.emit("userStatusChange", Object.assign({ userId }, status));
        console.log(`Emitting status change for ${userId}: ${status.isOnline ? "Online" : "Offline"} (Last Seen: ${status.lastSeen ? status.lastSeen.toISOString() : "N/A"})`);
    }
    else {
        console.error("Socket.IO 'io' instance not initialized when trying to emit user status change.");
    }
};
const initializeSocket = (ioInstance) => {
    io = ioInstance;
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: Token not provided."));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            socket.user = { userId: decoded.userId };
            next();
        }
        catch (err) {
            next(new Error("Authentication error: Invalid token."));
        }
    });
    io.on("connection", (socket) => {
        console.log(`🟢 User connected: ${socket.id}`);
        const user = socket.user;
        if (!user || !user.userId) {
            console.error(`Socket ${socket.id} connected without a valid user ID.`);
            socket.disconnect(true);
            return;
        }
        userStatuses.set(user.userId, { isOnline: true, lastSeen: null });
        emitUserStatusChange(user.userId, userStatuses.get(user.userId));
        socket.join(user.userId);
        console.log(`User ${user.userId} joined personal room.`);
        socket.on("joinConversation", (conversationId) => {
            socket.join(conversationId);
            console.log(`User ${user.userId} joined conversation room: ${conversationId}`);
        });
        /**
         * Event listener for sending a new message.
         * This event saves the message to the database and broadcasts it.
         */
        socket.on("sendMessage", (data) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                const { conversationId, content } = data;
                const conversationExists = yield prisma.conversation.findFirst({
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
                    console.warn(`User ${user.userId} attempted to send message to non-existent or unauthorized conversation ${conversationId}.`);
                    socket.emit("messageError", {
                        message: "Unauthorized or conversation not found.",
                    });
                    return;
                }
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
                yield prisma.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() },
                });
                io.to(conversationId).emit("receiveMessage", message); // Use the module-scoped 'io'
                console.log(`Message sent and broadcasted in conversation ${conversationId} by ${user.userId}.`);
                const recipient = message.conversation.participants.find((p) => p.id !== user.userId);
                if (recipient) {
                    const notification = yield prisma.notification.create({
                        data: {
                            userId: recipient.id,
                            type: "NEW_MESSAGE",
                            message: `You have a new message from ${((_a = message.sender.profile) === null || _a === void 0 ? void 0 : _a.name) || "a user"}.`,
                            link: `/messages/${conversationId}`,
                        },
                    });
                    io.to(recipient.id).emit("newNotification", notification); // Use the module-scoped 'io'
                    console.log(`Notification sent to ${recipient.id} for new message.`);
                }
            }
            catch (error) {
                console.error("Error sending message:", error);
                socket.emit("messageError", {
                    message: "Could not send message due to a server error.",
                });
            }
        }));
        /**
         * Event listener for when a goal is completed.
         * This creates a notification for the mentor.
         */
        socket.on("goalCompleted", (data) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                const { menteeId, mentorId } = data;
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
                            link: `/my-mentors`,
                        },
                    });
                    io.to(mentorId).emit("newNotification", notification); // Use the module-scoped 'io'
                    console.log(`Goal completion notification sent to mentor ${mentorId}.`);
                }
            }
            catch (error) {
                console.error("Error processing goal completion:", error);
                socket.emit("notificationError", {
                    message: "Could not process goal completion notification.",
                });
            }
        }));
        /**
         * Event listener for when a mentor updates their availability.
         * This creates notifications for their associated mentees.
         */
        socket.on("availabilityUpdated", (data) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
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
                        io.to(mentee.menteeId).emit("newNotification", notification); // Use the module-scoped 'io'
                        console.log(`Availability update notification sent to mentee ${mentee.menteeId}.`);
                    }
                }
            }
            catch (error) {
                console.error("Error processing availability update:", error);
                socket.emit("notificationError", {
                    message: "Could not process availability update notification.",
                });
            }
        }));
        // --- WebRTC Signaling Events ---
        // This is triggered when the mentee is ready to call.
        socket.on("mentee-ready", (data) => {
            socket
                .to(data.roomId)
                .emit("incoming-call", { menteeSocketId: socket.id });
        });
        // This is triggered when the mentor accepts the call.
        socket.on("mentor-accepted", (data) => {
            io.to(data.menteeSocketId).emit("mentor-joined", {
                mentorSocketId: socket.id,
            });
        });
        // These events relay the WebRTC connection data.
        socket.on("offer", (payload) => {
            io.to(payload.target).emit("offer", {
                from: socket.id,
                offer: payload.offer,
            });
        });
        socket.on("answer", (payload) => {
            io.to(payload.target).emit("answer", {
                from: socket.id,
                answer: payload.answer,
            });
        });
        socket.on("ice-candidate", (payload) => {
            io.to(payload.target).emit("ice-candidate", {
                from: socket.id,
                candidate: payload.candidate,
            });
        });
        // Handles joining the room initially.
        socket.on("join-room", (roomId) => {
            socket.join(roomId);
        });
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
                emitUserStatusChange(user.userId, userStatuses.get(user.userId)); // Notify all clients
            }
            socket.rooms.forEach((room) => {
                if (room !== socket.id) {
                    socket.to(room).emit("user-left", socket.id);
                }
            });
        });
    });
};
exports.initializeSocket = initializeSocket;
// You can optionally export a function to get the `io` instance
// if you need to emit events from other parts of your application (e.g., REST controllers).
const getIo = () => {
    // Corrected type: SocketIOServer
    if (!io) {
        throw new Error("Socket.IO server not initialized.");
    }
    return io;
};
exports.getIo = getIo;
