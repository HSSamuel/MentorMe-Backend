"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";
let io;
const initializeSocket = (ioInstance) => {
    io = ioInstance;
    console.log("✅ Real-time data socket service initialized.");
    // Use the main application's JWT for authentication
    // This token is different from the Twilio video token
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: Token not provided."));
        }
        try {
            // We only need the userId from the standard app token
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            socket.user = { userId: decoded.userId };
            next();
        }
        catch (err) {
            next(new Error("Authentication error: Invalid token."));
        }
    });
    io.on("connection", (socket) => {
        var _a;
        const userId = (_a = socket.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return socket.disconnect(true);
        }
        console.log(`\n🟢 Data socket connected: Socket ID ${socket.id}, User ID ${userId}`);
        // --- Event Handlers for Data Features ---
        // Allows the client to join a specific room for chat and notepad updates
        socket.on("join-data-room", (roomId) => {
            socket.join(roomId);
            console.log(`[Data] User ${socket.id} joined data room ${roomId}`);
        });
        // Handles real-time updates for the shared notepad
        socket.on("notepad-change", (data) => {
            // Broadcast the change to everyone else in the room
            socket.to(data.roomId).emit("notepad-update", data.content);
        });
        // Handles sending and receiving real-time chat messages
        socket.on("send-chat-message", (data) => {
            // Broadcast the message to everyone else in the room
            socket.to(data.roomId).emit("new-chat-message", {
                message: data.message,
                senderName: data.senderName,
                socketId: socket.id, // Identify the sender
            });
        });
        socket.on("disconnect", () => {
            console.log(`\n🔴 Data socket disconnected: Socket ID ${socket.id}`);
        });
    });
};
exports.initializeSocket = initializeSocket;
