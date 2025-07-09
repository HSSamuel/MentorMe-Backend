import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import rateLimit from "express-rate-limit";

// Import all route handlers
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import requestRoutes from "./routes/request.routes";
import adminRoutes from "./routes/admin.routes";
import sessionRoutes from "./routes/session.routes";
import reviewRoutes from "./routes/review.routes";
import goalRoutes from "./routes/goal.routes";
import messageRoutes from "./routes/message.routes";
import notificationRoutes from "./routes/notification.routes";
import calendarRoutes from "./routes/calendar.routes";
import aiRoutes from "./routes/ai.routes";

import "./config/passport";
import { initializeSocket } from "./services/socket.service";
import { jsonErrorHandler } from "./middleware/error.middleware";
import "./jobs/reminder.cron";

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI;

// --- More Robust CORS Configuration ---
const allowedOrigins = [
  "https://mentor-me-pi.vercel.app", // Your main Vercel URL
  "http://localhost:3000", // For local development
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

app.use(
  session({
    secret: process.env.JWT_SECRET || "a-default-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/ai", aiRoutes);

app.use(jsonErrorHandler);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

app.locals.io = io;

initializeSocket(io);

const startServer = async () => {
  if (!MONGO_URI) {
    console.error("🔴 MONGO_URI is not defined in .env file");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("🟢 MongoDB connected successfully");

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("🔴 Could not connect to MongoDB");
    console.error(error);
    process.exit(1);
  }
};

startServer();
