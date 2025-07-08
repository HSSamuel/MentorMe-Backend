// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

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
import aiRoutes from "./routes/ai.routes"; // Import the new AI routes

// Import passport config and socket service
import "./config/passport";
import { initializeSocket } from "./services/socket.service";
import { jsonErrorHandler } from "./middleware/error.middleware";

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Session Middleware
app.use(
  session({
    secret: process.env.JWT_SECRET || "a-default-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/ai", aiRoutes); // Use the new AI routes

// --- Global Error Handler ---
// This middleware MUST be placed after all other app.use() calls.
app.use(jsonErrorHandler);

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Initialize Socket.IO logic
initializeSocket(io);

// Connect to MongoDB and Then Start Server
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
