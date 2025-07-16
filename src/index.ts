import "dotenv/config"; // Loads environment variables from .env file
import express from "express";
import cors from "cors";
import mongoose from "mongoose"; // Mongoose for MongoDB interactions
import session from "express-session"; // For session management
import passport from "passport"; // For authentication strategies (e.g., social login)
import { createServer } from "http"; // Node.js built-in HTTP module
import { Server as SocketIOServer } from "socket.io"; // Socket.IO server
import path from "path"; // Node.js built-in path module for file paths
import rateLimit from "express-rate-limit"; // For API rate limiting
import MongoStore from "connect-mongo"; // To store sessions in MongoDB
import { PrismaClient } from "@prisma/client"; // [Add] Import PrismaClient for lastSeen updates

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

// Import Passport.js configuration (ensure it uses Mongoose models if applicable)
import "./config/passport";
// Import Socket.IO service initializer
import { initializeSocket } from "./services/socket.service";
// Import custom error handling middleware
import { jsonErrorHandler } from "./middleware/error.middleware";
// Import reminder.cron for its side effects (e.g., to start cron jobs directly)
import "./jobs/reminder.cron"; // This import will execute the file and any top-level cron setup

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI; // MongoDB connection URI from .env

const prisma = new PrismaClient(); // [Add] Initialize Prisma Client

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
const allowedOrigins = rawAllowedOrigins.filter(Boolean) as string[];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origin '${origin}' not allowed.`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "public", "uploads"))
);

// --- Session Middleware with MongoStore ---
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      process.env.JWT_SECRET ||
      "a-long-and-secure-default-session-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
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
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- Rate Limiting for Authentication Routes ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message:
    "Too many login attempts from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter, authRoutes);

// --- API Routes ---
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

// Root route
app.get("/", (req, res) => {
  res.send("Mentor Backend API is running!");
});

// Global error handler middleware - MUST be the last middleware added
app.use(jsonErrorHandler);

// Create HTTP server for Express app
const httpServer = createServer(app);

// Initialize Socket.IO server and attach it to the HTTP server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make the 'io' instance globally accessible via app.locals if needed by other Express routes/middleware
app.locals.io = io;

// [Add] Socket.IO connection handling for lastSeen
io.on("connection", async (socket) => {
  console.log("A user connected:", socket.id);

  const userId = socket.handshake.query.userId as string; // Get userId from handshake query

  if (userId) {
    try {
      await prisma.user.update({
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
    } catch (error) {
      console.error(
        `Error updating lastSeen for user ${userId} on connect:`,
        error
      );
    }
  }

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);
    if (userId) {
      try {
        await prisma.user.update({
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
      } catch (error) {
        console.error(
          `Error updating lastSeen for user ${userId} on disconnect:`,
          error
        );
      }
    }
  });

  // [Add] Optional: Update lastSeen on specific user activity (e.g., sending messages)
  socket.on("activity", async (data) => {
    if (data.userId) {
      try {
        await prisma.user.update({
          where: { id: data.userId },
          data: { lastSeen: new Date() },
        });
      } catch (error) {
        console.error(
          `Error updating lastSeen for user ${data.userId} on activity:`,
          error
        );
      }
    }
  });
});

// IMPORTANT: Initialize your Socket.IO service with the created 'io' instance
initializeSocket(io);

// Function to connect to MongoDB and start the server
const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🟢 MongoDB connected successfully");

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("🔴 Could not connect to MongoDB:", error);
    process.exit(1);
  }
};

// Start the server
startServer();

// --- Process Error Handling ---
process.on("unhandledRejection", (err: Error, promise: Promise<any>) => {
  console.error(
    `Unhandled Rejection at: ${promise} - Reason: ${err.message}`,
    err.stack
  );
  httpServer.close(() => process.exit(1));
});

process.on("SIGTERM", async () => {
  console.log(
    "SIGTERM signal received: closing HTTP server and disconnecting from DB."
  );
  await mongoose.disconnect();
  httpServer.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log(
    "SIGINT signal received: closing HTTP server and disconnecting from DB."
  );
  await mongoose.disconnect();
  httpServer.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
});
