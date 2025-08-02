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
  deleteSession,
  deleteUser,
} from "../controllers/admin.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware, adminMiddleware);
router.get("/dashboard", getDashboardData);
router.get("/users", getAllUsers);
router.put("/users/:id/role", updateUserRole);
router.get("/matches", getAllMatches);
router.post("/matches", assignMentor);
router.get("/sessions", getAllSessions);
router.delete("/sessions/:sessionId", deleteSession);
router.get("/stats", getStats);
router.delete("/requests/:id", deleteRequest);
router.put("/requests/:id/status", updateRequestStatus);
router.delete("/users/:userId", deleteUser);

export default router;
