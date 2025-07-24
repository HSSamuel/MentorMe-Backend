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
  getDashboardData,
} from "../controllers/admin.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = Router();

// This line applies the authentication and admin checks to ALL routes in this file.
router.use(authMiddleware, adminMiddleware);
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
