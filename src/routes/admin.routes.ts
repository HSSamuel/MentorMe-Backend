import { Router } from "express";
import {
  getAllUsers,
  updateUserRole,
  getAllMatches,
  getAllSessions,
  assignMentor,
  getStats,
} from "../controllers/admin.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth.middleware";

const router = Router();

// This line applies the authentication and admin checks to ALL routes in this file.
router.use(authMiddleware, adminMiddleware);

// Define the routes without repeating the middleware
router.get("/users", getAllUsers);
router.put("/users/:id/role", updateUserRole);
router.get("/matches", getAllMatches);
router.get("/sessions", getAllSessions);
router.post("/assign", assignMentor);
router.get("/stats", getStats);

export default router;
