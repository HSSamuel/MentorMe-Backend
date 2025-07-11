// Mentor/Backend/src/routes/request.routes.ts
import { Router } from "express";
import {
  createRequest,
  getSentRequests,
  getReceivedRequests,
  updateRequestStatus,
} from "../controllers/request.controller";
import {
  authMiddleware,
  menteeMiddleware,
  mentorMiddleware,
} from "../middleware/auth.middleware";
import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// This route is correct
router.post(
  "/",
  authMiddleware,
  menteeMiddleware,
  [body("mentorId").notEmpty().withMessage("Mentor ID is required")],
  validateRequest,
  createRequest
);

// This route is correct
router.get("/sent", authMiddleware, menteeMiddleware, getSentRequests);

// This route is correct
router.get("/received", authMiddleware, mentorMiddleware, getReceivedRequests);

// FIX: Changed .isUUID() to .isMongoId()
router.put(
  "/:id",
  authMiddleware,
  mentorMiddleware,
  [
    param("id").isMongoId().withMessage("Invalid request ID"), // Changed from isUUID()
    body("status").isIn(["ACCEPTED", "REJECTED"]).withMessage("Invalid status"),
  ],
  validateRequest,
  updateRequestStatus
);

export default router;
