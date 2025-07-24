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
  getDashboardData, // 1. Import the new controller function
} from "../controllers/admin.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = Router();

// This line applies the authentication and admin checks to ALL routes in this file.
router.use(authMiddleware, adminMiddleware);

// --- [NEW] A dedicated route for all dashboard data ---
router.get("/dashboard", getDashboardData);
// --- END OF NEW ROUTE ---

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
