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
    console.log("✅ Socket.IO service initialized.");
    // --- Authentication Middleware for all incoming socket connections ---
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            console.error("Auth Error: Socket connection rejected. Token not provided.");
            return next(new Error("Authentication error: Token not provided."));
        }
        try {
            // Decode the unique videoToken which contains both userId and sessionId
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            socket.user = { userId: decoded.userId, sessionId: decoded.sessionId };
            next();
        }
        catch (err) {
            console.error("Auth Error: Socket connection rejected. Invalid token.");
            next(new Error("Authentication error: Invalid token."));
        }
    });
    // --- Single, Unified Connection Handler ---
    io.on("connection", (socket) => {
        var _a, _b;
        const userId = (_a = socket.user) === null || _a === void 0 ? void 0 : _a.userId;
        const sessionId = (_b = socket.user) === null || _b === void 0 ? void 0 : _b.sessionId; // Get sessionId from the authenticated token
        if (!userId || !sessionId) {
            console.error(`Socket ${socket.id} connected but is missing user/session ID from its token.`);
            socket.disconnect(true);
            return;
        }
        console.log(`\n🟢 User Connected:`);
        console.log(`   - Socket ID: ${socket.id}`);
        console.log(`   - User ID:   ${userId}`);
        // --- User Presence and Status Handling (Existing Logic) ---
        socket.join(userId); // Join a personal room for direct notifications
        userStatuses.set(userId, { isOnline: true, lastSeen: null });
        emitUserStatusChange(userId, { isOnline: true, lastSeen: null });
        prisma.user
            .update({ where: { id: userId }, data: { lastSeen: new Date() } })
            .catch(console.error);
        // --- WebRTC Signaling Events ---
        socket.on("join-room", (roomId) => {
            if (roomId !== sessionId) {
                console.warn(`   - WARNING: User ${userId} tried to join room ${roomId} but their token is for room ${sessionId}.`);
                return;
            }
            socket.join(roomId);
            console.log(`   - Action: User joined room ${roomId}`);
            const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
            const otherUsers = Array.from(clientsInRoom || []).filter((id) => id !== socket.id);
            if (otherUsers.length > 0) {
                const otherUserSocketId = otherUsers[0];
                console.log(`   - Signaling: Notifying ${socket.id} about existing user ${otherUserSocketId}`);
                socket.emit("other-user", otherUserSocketId);
            }
            else {
                console.log(`   - Signaling: User is the first in the room. Waiting for another user.`);
            }
        });
        socket.on("offer", (payload) => {
            console.log(`   - Signaling: Relaying offer from ${socket.id} to ${payload.target}`);
            io.to(payload.target).emit("offer", {
                from: socket.id,
                offer: payload.offer,
            });
        });
        socket.on("answer", (payload) => {
            // --- THIS IS THE NEW LOG MESSAGE THAT WAS ADDED ---
            console.log(`✅ Video Connected: Signaling complete between ${socket.id} and ${payload.target}`);
            console.log(`   - Signaling: Relaying answer from ${socket.id} to ${payload.target}`);
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
        // --- Shared Notepad Events (Existing Logic) ---
        socket.on("get-notepad-content", (roomId) => {
            const room = io.sockets.adapter.rooms.get(roomId);
            if (room) {
                // @ts-ignore
                const content = room.notepadContent || "";
                socket.emit("notepad-content", content);
            }
        });
        socket.on("notepad-change", (data) => {
            const room = io.sockets.adapter.rooms.get(data.roomId);
            if (room) {
                // @ts-ignore
                room.notepadContent = data.content;
            }
            socket.to(data.roomId).emit("notepad-content", data.content);
        });
        // --- Disconnect Handler ---
        socket.on("disconnect", () => {
            console.log(`\n🔴 User Disconnected:`);
            console.log(`   - Socket ID: ${socket.id}`);
            console.log(`   - User ID:   ${userId}`);
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
