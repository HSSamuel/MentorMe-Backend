import { Router } from "express";
import {
  getGoalsForMentorship,
  createGoal,
  updateGoal,
  deleteGoal,
  getAllMyGoals,
} from "../controllers/goal.controller";
import {
  authMiddleware,
  menteeMiddleware, // Import menteeMiddleware
} from "../middleware/auth.middleware";
import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// This route now correctly uses menteeMiddleware
router.get("/", authMiddleware, menteeMiddleware, getAllMyGoals);

// This route is for viewing goals within a specific mentorship, accessible by both mentor and mentee
router.get(
  "/:mentorshipId",
  authMiddleware,
  [param("mentorshipId").isMongoId().withMessage("Invalid mentorship ID")],
  validateRequest,
  getGoalsForMentorship
);

// Create a new goal - This now correctly uses menteeMiddleware
router.post(
  "/",
  authMiddleware,
  menteeMiddleware, // This was the missing piece
  [
    body("mentorshipRequestId")
      .isMongoId()
      .withMessage("A valid mentorship must be selected"),
    body("title").notEmpty().withMessage("Goal title is required"),
    body("specific").notEmpty().withMessage("The 'Specific' field is required"),
    body("measurable")
      .notEmpty()
      .withMessage("The 'Measurable' field is required"),
    body("achievable")
      .notEmpty()
      .withMessage("The 'Achievable' field is required"),
    body("relevant").notEmpty().withMessage("The 'Relevant' field is required"),
    body("timeBound")
      .notEmpty()
      .withMessage("The 'Time-bound' field is required"),
  ],
  validateRequest,
  createGoal
);

// Update a goal - Only the mentee who owns the goal can update it
router.put(
  "/:goalId",
  authMiddleware,
  menteeMiddleware,
  [
    param("goalId").isMongoId().withMessage("Invalid goal ID"),
    body("title").optional().notEmpty().withMessage("Title cannot be empty"),
    body("isCompleted")
      .optional()
      .isBoolean()
      .withMessage("isCompleted must be a boolean"),
  ],
  validateRequest,
  updateGoal
);

// Delete a goal - Only the mentee who owns the goal can delete it
router.delete(
  "/:goalId",
  authMiddleware,
  menteeMiddleware,
  [param("goalId").isMongoId().withMessage("Invalid goal ID")],
  validateRequest,
  deleteGoal
);

export default router;
