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

// POST /api/reviews/
// This route allows an authenticated mentee to create a new review for a mentorship.
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

// GET /api/reviews/mentor/:mentorId
// This route is public and fetches all reviews for a specific mentor's profile.
// It correctly points to the getReviewsForMentor function we updated.
router.get(
  "/mentor/:mentorId",
  [param("mentorId").isMongoId().withMessage("Invalid mentor ID")],
  validateRequest,
  getReviewsForMentor
);

export default router;
