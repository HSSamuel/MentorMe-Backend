// Mentor/Backend/src/routes/review.routes.ts

import { Router } from "express";
import {
  createReview,
  getReviewsForMentor,
} from "../controllers/review.controller";
import {
  authMiddleware,
  menteeMiddleware,
} from "../middleware/auth.middleware";
import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// Mentee: Create a new review for a mentorship
router.post(
  "/",
  authMiddleware,
  menteeMiddleware,
  [
    body("mentorshipRequestId")
      .isMongoId()
      .withMessage("Invalid mentorship request ID"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be an integer between 1 and 5"),
    body("comment").notEmpty().withMessage("Comment is required"),
  ],
  validateRequest,
  createReview
);

// Public: Get all reviews for a specific mentor
router.get(
  "/mentor/:mentorId",
  [param("mentorId").isMongoId().withMessage("Invalid mentor ID")],
  validateRequest,
  getReviewsForMentor
);

export default router;
