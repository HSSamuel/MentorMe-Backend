"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIo = exports.initializeSocket = void 0;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";
let io;
const userStatuses = new Map();
const emitUserStatusChange = (userId, status) => {
    if (io) {
        io.emit("userStatusChange", Object.assign({ userId }, status));
    }
};
const initializeSocket = (ioInstance) => {
    io = ioInstance;
    // --- Authentication Middleware for all incoming socket connections ---
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: Token not provided."));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            socket.user = { userId: decoded.userId }; // Attach user info to the socket
            next();
        }
        catch (err) {
            next(new Error("Authentication error: Invalid token."));
        }
    });
    // --- Single, Unified Connection Handler ---
    io.on("connection", (socket) => {
        var _a;
        const userId = (_a = socket.user) === null || _a === void 0 ? void 0 : _a.userId;
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
        socket.on("join-room", (roomId) => {
            socket.join(roomId);
            const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
            const otherUsers = Array.from(clientsInRoom || []).filter((id) => id !== socket.id);
            if (otherUsers.length > 0) {
                const otherUserSocketId = otherUsers[0];
                socket.emit("other-user", otherUserSocketId);
            }
        });
        // Using 'any' to bypass the persistent build errors
        socket.on("offer", (payload) => {
            io.to(payload.target).emit("offer", {
                from: socket.id,
                offer: payload.offer,
            });
        });
        // Using 'any' to bypass the persistent build errors
        socket.on("answer", (payload) => {
            io.to(payload.target).emit("answer", {
                from: socket.id,
                answer: payload.answer,
            });
        });
        // Using 'any' to bypass the persistent build errors
        socket.on("ice-candidate", (payload) => {
            io.to(payload.target).emit("ice-candidate", {
                from: socket.id,
                candidate: payload.candidate,
            });
        });
        // When a user joins, if there's existing content for that room, send it to them.
        socket.on("get-notepad-content", (roomId) => {
            const room = io.sockets.adapter.rooms.get(roomId);
            if (room) {
                // @ts-ignore - We are attaching custom properties to the room object
                const content = room.notepadContent || "";
                socket.emit("notepad-content", content);
            }
        });
        // When a user types, update the content and broadcast it to the room.
        socket.on("notepad-change", (data) => {
            const room = io.sockets.adapter.rooms.get(data.roomId);
            if (room) {
                // Store the content on the room object itself for persistence during the session.
                // @ts-ignore
                room.notepadContent = data.content;
            }
            // Broadcast the change to everyone else in the room
            socket.to(data.roomId).emit("notepad-content", data.content);
        });
        // --- Disconnect Handler ---
        socket.on("disconnect", () => {
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
exports.initializeSocket = initializeSocket;
const getIo = () => {
    if (!io) {
        throw new Error("Socket.IO server not initialized.");
    }
    return io;
};
exports.getIo = getIo;
