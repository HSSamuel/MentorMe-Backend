import { Router } from "express";
import {
  getGoalsForMentorship,
  createGoal,
  updateGoal,
  deleteGoal,
} from "../controllers/goal.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

// Get all goals for a specific mentorship
router.get(
  "/:mentorshipId",
  authMiddleware,
  [param("mentorshipId").isMongoId().withMessage("Invalid mentorship ID")],
  validateRequest,
  getGoalsForMentorship
);

// Create a new goal
router.post(
  "/",
  authMiddleware,
  [
    body("mentorshipRequestId")
      .isMongoId()
      .withMessage("Invalid mentorship ID"),
    body("title").notEmpty().withMessage("Goal title is required"),
  ],
  validateRequest,
  createGoal
);

// Update a goal
router.put(
  "/:goalId",
  authMiddleware,
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

// Delete a goal
router.delete(
  "/:goalId",
  authMiddleware,
  [param("goalId").isMongoId().withMessage("Invalid goal ID")],
  validateRequest,
  deleteGoal
);

export default router;
