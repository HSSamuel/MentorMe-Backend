import { Router } from "express";
import {
  getAllUsers,
  updateUserRole,
  getAllMatches,
  getAllSessions,
  assignMentor,
  getStats,
  deleteRequest,
  updateRequestStatus,
  getDashboardData, // --- 1. IMPORT THE DASHBOARD FUNCTION ---
} from "../controllers/admin.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = Router();

// This middleware ensures all routes in this file are protected and only accessible by admins.
router.use(authMiddleware, adminMiddleware);

// --- 2. ADD THE MISSING DASHBOARD ROUTE ---
router.get("/dashboard", getDashboardData);

// Define the existing routes
router.get("/users", getAllUsers);
router.put("/users/:id/role", updateUserRole);
router.get("/matches", getAllMatches);
router.post("/matches", assignMentor);
router.get("/sessions", getAllSessions);
router.get("/stats", getStats);
router.delete("/requests/:id", deleteRequest);
router.put("/requests/:id/status", updateRequestStatus);

export default router;
