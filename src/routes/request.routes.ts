import { Router } from "express";
import {
  createRequest,
  getSentRequests,
  getReceivedRequests,
  updateRequestStatus,
  getRequestStatusWithMentor, // 1. Import the new controller function
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

// FIX: Add the new route to check the status of a request with a specific mentor
router.get(
  "/status/:mentorId",
  authMiddleware,
  menteeMiddleware,
  [param("mentorId").isMongoId().withMessage("Invalid mentor ID")],
  validateRequest,
  getRequestStatusWithMentor
);

router.put(
  "/:id",
  authMiddleware,
  mentorMiddleware,
  [
    param("id").isMongoId().withMessage("Invalid request ID"),
    body("status").isIn(["ACCEPTED", "REJECTED"]).withMessage("Invalid status"),
  ],
  validateRequest,
  updateRequestStatus
);

export default router;
