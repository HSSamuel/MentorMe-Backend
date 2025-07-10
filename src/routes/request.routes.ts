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

router.post(
  "/",
  authMiddleware,
  menteeMiddleware,
  [body("mentorId").notEmpty().withMessage("Mentor ID is required")],
  validateRequest,
  createRequest
);

router.get("/sent", authMiddleware, menteeMiddleware, getSentRequests);

router.get("/received", authMiddleware, mentorMiddleware, getReceivedRequests);

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
