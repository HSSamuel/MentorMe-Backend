"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const socket_io_1 = require("socket.io");
// Route handlers
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
const stream_routes_1 = __importDefault(require("./routes/stream.routes"));
const community_routes_1 = __importDefault(require("./routes/community.routes"));
const resource_routes_1 = __importDefault(require("./routes/resource.routes"));
const discover_routes_1 = __importDefault(require("./routes/discover.routes")); // --- 1. IMPORT NEW DISCOVER ROUTES ---
const gamification_service_1 = require("./services/gamification.service");
// Configurations and Services
require("./config/passport");
const socket_service_1 = require("./services/socket.service");
const error_middleware_1 = require("./middleware/error.middleware");
require("./jobs/reminder.cron");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
    console.error("🔴 MONGO_URI is not defined in .env file. Exiting.");
    process.exit(1);
}
app.set("trust proxy", 1);
// --- CORS Configuration ---
const allowedOrigins = [
    "https://dsamentor.netlify.app",
    "http://localhost:3000",
    process.env.VITE_FRONTEND_URL,
].filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
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
// --- Session Middleware ---
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "a-long-and-secure-default-session-secret",
    resave: false,
    saveUninitialized: false,
    store: connect_mongo_1.default.create({
        mongoUrl: MONGO_URI,
        collectionName: "sessions",
        ttl: 7 * 24 * 60 * 60, // 7 days
    }),
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// --- Rate Limiting ---
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP, please try again after 15 minutes",
});
// --- API Routes ---
app.use("/api/auth", authLimiter, auth_routes_1.default);
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
app.use("/api/community", community_routes_1.default);
app.use("/api/stream", stream_routes_1.default);
app.use("/api/resources", resource_routes_1.default);
app.use("/api/discover", discover_routes_1.default); // --- 2. USE NEW DISCOVER ROUTES ---
app.get("/", (req, res) => {
    res.send("Mentor Backend API is running!");
});
app.use(error_middleware_1.jsonErrorHandler);
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: corsOptions,
});
app.locals.io = io;
// Initialize all the socket event listeners (like 'connection', 'join', etc.).
(0, socket_service_1.initializeSocket)(io);
// --- End of Socket.IO Initialization ---
// --- Start Server ---
const startServer = async () => {
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log("🟢 MongoDB connected successfully");
        await (0, gamification_service_1.seedLevels)();
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("🔴 Could not connect to MongoDB:", error);
        process.exit(1);
    }
};
startServer();
