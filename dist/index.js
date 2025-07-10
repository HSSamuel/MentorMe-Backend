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
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
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
require("./config/passport");
const socket_service_1 = require("./services/socket.service");
const error_middleware_1 = require("./middleware/error.middleware");
require("./jobs/reminder.cron");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI;
app.set("trust proxy", 1);
// --- Correct CORS Configuration ---
const allowedOrigins = [
    "https://dsamentor.netlify.app",
    "https://mentor-me-pi.vercel.app",
    "http://localhost:3000",
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../public/uploads")));
// --- Session Middleware with MongoStore ---
app.use((0, express_session_1.default)({
    secret: process.env.JWT_SECRET || "a-default-session-secret",
    resave: false,
    saveUninitialized: false,
    store: connect_mongo_1.default.create({
        mongoUrl: MONGO_URI,
        collectionName: "sessions",
    }),
    cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24,
    },
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
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
app.use(error_middleware_1.jsonErrorHandler);
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    },
});
app.locals.io = io;
(0, socket_service_1.initializeSocket)(io);
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!MONGO_URI) {
        console.error("🔴 MONGO_URI is not defined in .env file");
        process.exit(1);
    }
    try {
        yield mongoose_1.default.connect(MONGO_URI);
        console.log("🟢 MongoDB connected successfully");
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("🔴 Could not connect to MongoDB");
        console.error(error);
        process.exit(1);
    }
});
startServer();
