import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import { createServer } from "http";
import path from "path";
import rateLimit from "express-rate-limit";
import MongoStore from "connect-mongo";

// Route handlers
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
// --- [NEW] Import the new routes for Stream token generation ---
import streamRoutes from "./routes/stream.routes";

// Configurations and Services
import "./config/passport";
// The old socket service is no longer needed for the main chat
// import { initializeSocket } from "./services/socket.service";
import { jsonErrorHandler } from "./middleware/error.middleware";
import "./jobs/reminder.cron";

const app = express();
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
  "https://mentor-me-pi.vercel.app",
  "http://localhost:3000",
  process.env.VITE_FRONTEND_URL,
].filter(Boolean) as string[];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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

// --- Session Middleware ---
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "a-long-and-secure-default-session-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
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
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- Rate Limiting ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// --- API Routes ---
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
// --- [NEW] This line registers the /api/stream/token endpoint ---
app.use("/api/stream", streamRoutes);

app.get("/", (req, res) => {
  res.send("Mentor Backend API is running!");
});

app.use(jsonErrorHandler);

const httpServer = createServer(app);

// --- Start Server ---
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

startServer();
