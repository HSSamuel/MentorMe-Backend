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
// User presence logic (no changes)
const userStatuses = new Map();
const emitUserStatusChange = (userId, status) => {
    if (io) {
        io.emit("userStatusChange", Object.assign({ userId }, status));
    }
};
const initializeSocket = (ioInstance) => {
    io = ioInstance;
    console.log("✅ Socket.IO service initialized.");
    // Authentication (no changes)
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: Token not provided."));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            socket.user = { userId: decoded.userId, sessionId: decoded.sessionId };
            next();
        }
        catch (err) {
            next(new Error("Authentication error: Invalid token."));
        }
    });
    io.on("connection", (socket) => {
        var _a, _b;
        const userId = (_a = socket.user) === null || _a === void 0 ? void 0 : _a.userId;
        const sessionId = (_b = socket.user) === null || _b === void 0 ? void 0 : _b.sessionId;
        if (!userId || !sessionId) {
            socket.disconnect(true);
            return;
        }
        console.log(`\n🟢 User Connected: Socket ID ${socket.id}, User ID ${userId}`);
        socket.join(userId);
        userStatuses.set(userId, { isOnline: true, lastSeen: null });
        emitUserStatusChange(userId, { isOnline: true, lastSeen: null });
        prisma.user
            .update({ where: { id: userId }, data: { lastSeen: new Date() } })
            .catch(console.error);
        // --- [CORRECTED & SIMPLIFIED] WebRTC Signaling Events ---
        socket.on("join-room", (roomId) => {
            if (roomId !== sessionId) {
                console.warn(`[AUTH_WARN] User ${userId} blocked from joining wrong room ${roomId}.`);
                return;
            }
            socket.join(roomId);
            console.log(`[JOIN] User ${socket.id} joined room ${roomId}`);
            const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
            const otherUsers = Array.from(clientsInRoom || []).filter((id) => id !== socket.id);
            if (otherUsers.length > 0) {
                const otherUserSocketId = otherUsers[0];
                console.log(`[SIGNAL] Other user ${otherUserSocketId} found. Notifying ${socket.id} to start the call.`);
                socket.emit("other-user", otherUserSocketId);
            }
            else {
                console.log(`[SIGNAL] User ${socket.id} is the first in the room. Waiting...`);
            }
        });
        // --- All other signaling events are just relays (no changes) ---
        socket.on("offer", (payload) => {
            console.log(`[SIGNAL] Relaying OFFER from ${socket.id} to ${payload.target}`);
            io.to(payload.target).emit("offer", {
                from: socket.id,
                offer: payload.offer,
            });
        });
        socket.on("answer", (payload) => {
            console.log(`[SIGNAL] Relaying ANSWER from ${socket.id} to ${payload.target}`);
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
exports.initializeSocket = initializeSocket;
const getIo = () => {
    if (!io) {
        throw new Error("Socket.IO server not initialized.");
    }
    return io;
};
exports.getIo = getIo;
