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
require("dotenv/config"); // Loads environment variables from .env file
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose")); // Mongoose for MongoDB interactions
const express_session_1 = __importDefault(require("express-session")); // For session management
const passport_1 = __importDefault(require("passport")); // For authentication strategies (e.g., social login)
const http_1 = require("http"); // Node.js built-in HTTP module
const socket_io_1 = require("socket.io"); // Socket.IO server
const path_1 = __importDefault(require("path")); // Node.js built-in path module for file paths
const express_rate_limit_1 = __importDefault(require("express-rate-limit")); // For API rate limiting
const connect_mongo_1 = __importDefault(require("connect-mongo")); // To store sessions in MongoDB
const client_1 = require("@prisma/client"); // [Add] Import PrismaClient for lastSeen updates
// Import all route handlers
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const request_routes_1 = __importDefault(require("./routes/request.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const session_routes_1 = __importDefault(require("./routes/session.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const goal_routes_1 = __importDefault(require("./routes/goal.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const calendar_routes_1 = __importDefault(require("./routes/calendar.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
// Import Passport.js configuration (ensure it uses Mongoose models if applicable)
require("./config/passport");
// Import Socket.IO service initializer
const socket_service_1 = require("./services/socket.service");
// Import custom error handling middleware
const error_middleware_1 = require("./middleware/error.middleware");
// Import reminder.cron for its side effects (e.g., to start cron jobs directly)
require("./jobs/reminder.cron"); // This import will execute the file and any top-level cron setup
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI; // MongoDB connection URI from .env
const prisma = new client_1.PrismaClient(); // [Add] Initialize Prisma Client
// Ensure MONGO_URI is defined before starting the server
if (!MONGO_URI) {
    console.error("🔴 MONGO_URI is not defined in .env file. Exiting.");
    process.exit(1);
}
// Trust the first proxy (e.g., if behind Nginx, Heroku, Vercel)
app.set("trust proxy", 1);
// --- CORS Configuration ---
const rawAllowedOrigins = [
    "https://dsamentor.netlify.app",
    "https://mentor-me-pi.vercel.app",
    "http://localhost:3000", // For local development
    process.env.VITE_FRONTEND_URL, // Allow dynamic frontend URL from env
];
// Filter out any undefined values to satisfy Socket.IO's CORS origin type
const allowedOrigins = rawAllowedOrigins.filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`CORS: Origin '${origin}' not allowed.`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "..", "public", "uploads")));
// --- Session Middleware with MongoStore ---
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET ||
        process.env.JWT_SECRET ||
        "a-long-and-secure-default-session-secret",
    resave: false,
    saveUninitialized: false,
    store: connect_mongo_1.default.create({
        mongoUrl: MONGO_URI,
        collectionName: "sessions",
        touchAfter: 24 * 3600,
        ttl: 7 * 24 * 60 * 60,
    }),
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// --- Rate Limiting for Authentication Routes ---
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many login attempts from this IP, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api/auth", authLimiter, auth_routes_1.default);
// --- API Routes ---
app.use("/api/users", user_routes_1.default);
app.use("/api/requests", request_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/sessions", session_routes_1.default);
app.use("/api/reviews", review_routes_1.default);
app.use("/api/goals", goal_routes_1.default);
app.use("/api/messages", message_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
app.use("/api/calendar", calendar_routes_1.default);
app.use("/api/ai", ai_routes_1.default);
// Root route
app.get("/", (req, res) => {
    res.send("Mentor Backend API is running!");
});
// Global error handler middleware - MUST be the last middleware added
app.use(error_middleware_1.jsonErrorHandler);
// Create HTTP server for Express app
const httpServer = (0, http_1.createServer)(app);
// Initialize Socket.IO server and attach it to the HTTP server
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    },
});
// Make the 'io' instance globally accessible via app.locals if needed by other Express routes/middleware
app.locals.io = io;
// [Add] Socket.IO connection handling for lastSeen
io.on("connection", (socket) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("A user connected:", socket.id);
    const userId = socket.handshake.query.userId; // Get userId from handshake query
    if (userId) {
        try {
            yield prisma.user.update({
                where: { id: userId },
                data: {
                    lastSeen: new Date(), // [Add] Update lastSeen on connection
                },
            });
            // console.log(`User ${userId} is now online. lastSeen updated.`);
            io.emit("userStatusChange", {
                userId,
                status: "online",
                lastSeen: new Date(),
            }); // [Add] Notify others of status change
        }
        catch (error) {
            console.error(`Error updating lastSeen for user ${userId} on connect:`, error);
        }
    }
    socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log("User disconnected:", socket.id);
        if (userId) {
            try {
                yield prisma.user.update({
                    where: { id: userId },
                    data: {
                        lastSeen: new Date(), // [Add] Update lastSeen on disconnection
                    },
                });
                // console.log(`User ${userId} disconnected. lastSeen updated.`);
                io.emit("userStatusChange", {
                    userId,
                    status: "offline",
                    lastSeen: new Date(),
                }); // [Add] Notify others of status change
            }
            catch (error) {
                console.error(`Error updating lastSeen for user ${userId} on disconnect:`, error);
            }
        }
    }));
    // [Add] Optional: Update lastSeen on specific user activity (e.g., sending messages)
    socket.on("activity", (data) => __awaiter(void 0, void 0, void 0, function* () {
        if (data.userId) {
            try {
                yield prisma.user.update({
                    where: { id: data.userId },
                    data: { lastSeen: new Date() },
                });
            }
            catch (error) {
                console.error(`Error updating lastSeen for user ${data.userId} on activity:`, error);
            }
        }
    }));
}));
// IMPORTANT: Initialize your Socket.IO service with the created 'io' instance
(0, socket_service_1.initializeSocket)(io);
// Function to connect to MongoDB and start the server
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(MONGO_URI);
        console.log("🟢 MongoDB connected successfully");
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("🔴 Could not connect to MongoDB:", error);
        process.exit(1);
    }
});
// Start the server
startServer();
// --- Process Error Handling ---
process.on("unhandledRejection", (err, promise) => {
    console.error(`Unhandled Rejection at: ${promise} - Reason: ${err.message}`, err.stack);
    httpServer.close(() => process.exit(1));
});
process.on("SIGTERM", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("SIGTERM signal received: closing HTTP server and disconnecting from DB.");
    yield mongoose_1.default.disconnect();
    httpServer.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
}));
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("SIGINT signal received: closing HTTP server and disconnecting from DB.");
    yield mongoose_1.default.disconnect();
    httpServer.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
    });
}));
