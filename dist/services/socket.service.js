"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = __importDefault(require("../client"));
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";
// A map to track user sockets and online status globally
const userSockets = new Map(); // Map<userId, socketId>
let io;
const initializeSocket = (ioInstance) => {
    io = ioInstance;
    console.log("✅ Real-time data socket service initialized.");
    // Use the main application's JWT for authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: Token not provided."));
        }
        try {
            // Be flexible and check for 'id' or 'userId' in the token payload.
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const userId = decoded.id || decoded.userId;
            if (!userId) {
                throw new Error("User ID not found in token");
            }
            socket.user = { userId };
            next();
        }
        catch (err) {
            next(new Error("Authentication error: Invalid token."));
        }
    });
    io.on("connection", async (socket) => {
        // Made the handler async
        const userId = socket.user?.userId;
        if (!userId) {
            return socket.disconnect(true);
        }
        console.log(`\n🟢 Data socket connected: Socket ID ${socket.id}, User ID ${userId}`);
        // --- [THE FIX] ---
        // This logic checks the user's role and adds them to a special room if they are an admin.
        // This allows us to send real-time updates specifically to all connected admins.
        try {
            const user = await client_1.default.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            if (user && user.role === "ADMIN") {
                socket.join("admin-room");
                console.log(`[Admin] User ${userId} joined the admin-room.`);
            }
        }
        catch (error) {
            console.error(`Failed to fetch user role for socket connection: ${userId}`, error);
        }
        // --- End of new logic ---
        // --- Global Presence and Personal Room Logic for Main Chat ---
        userSockets.set(userId, socket.id);
        socket.join(userId); // Join a personal room for direct notifications
        io.emit("userStatusChange", { userId, isOnline: true, lastSeen: null });
        // --- Event Handlers for Video Call Features (Existing Code) ---
        socket.on("join-data-room", (roomId) => {
            socket.join(roomId);
            console.log(`[Data] User ${socket.id} joined data room ${roomId}`);
        });
        socket.on("notepad-change", (data) => {
            socket.to(data.roomId).emit("notepad-update", data.content);
        });
        socket.on("send-chat-message", (data) => {
            socket.to(data.roomId).emit("new-chat-message", {
                message: data.message,
                senderName: data.senderName,
                socketId: socket.id,
            });
        });
        // --- Event Handlers for Main Messaging Feature ---
        socket.on("joinConversation", (conversationId) => {
            socket.join(conversationId);
            console.log(`[Messages] User ${userId} joined conversation ${conversationId}`);
        });
        socket.on("sendMessage", async (data, callback) => {
            try {
                const { conversationId, content, tempId } = data;
                const [newMessage, updatedConversation] = await client_1.default.$transaction([
                    client_1.default.message.create({
                        data: { content, senderId: userId, conversationId },
                        include: {
                            sender: {
                                select: {
                                    id: true,
                                    profile: { select: { name: true, avatarUrl: true } },
                                },
                            },
                        },
                    }),
                    client_1.default.conversation.update({
                        where: { id: conversationId },
                        data: { updatedAt: new Date() },
                        include: { participants: true },
                    }),
                ]);
                const messageWithTempId = { ...newMessage, tempId };
                updatedConversation.participants.forEach((participant) => {
                    io.to(participant.id).emit("receiveMessage", messageWithTempId);
                });
                if (callback)
                    callback({ success: true });
            }
            catch (error) {
                console.error("[Messages] Error in sendMessage:", error);
                if (callback)
                    callback({ success: false, error: "Failed to save message." });
            }
        });
        socket.on("startTyping", ({ conversationId }) => {
            socket
                .to(conversationId)
                .emit("userTyping", { conversationId, isTyping: true });
        });
        socket.on("stopTyping", ({ conversationId }) => {
            socket
                .to(conversationId)
                .emit("userTyping", { conversationId, isTyping: false });
        });
        socket.on("disconnect", async () => {
            console.log(`\n🔴 Data socket disconnected: Socket ID ${socket.id}`);
            // --- Global Presence on Disconnect for Main Chat ---
            userSockets.delete(userId);
            const lastSeen = new Date().toISOString();
            try {
                await client_1.default.user.update({
                    where: { id: userId },
                    data: { lastSeen },
                });
                io.emit("userStatusChange", { userId, isOnline: false, lastSeen });
            }
            catch (error) {
                console.error(`Failed to update lastSeen for user ${userId}`, error);
            }
        });
    });
};
exports.initializeSocket = initializeSocket;
