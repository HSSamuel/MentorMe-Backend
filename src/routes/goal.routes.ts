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
  menteeMiddleware,
} from "../middleware/auth.middleware";
import { body, param } from "express-validator";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/", authMiddleware, menteeMiddleware, getAllMyGoals);

// FIX: Standardize parameter to '/:id'
router.get(
  "/mentorship/:id",
  authMiddleware,
  [param("id").isMongoId().withMessage("Invalid mentorship ID")],
  validateRequest,
  getGoalsForMentorship
);

router.post(
  "/",
  authMiddleware,
  menteeMiddleware,
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

// FIX: Standardize parameter to '/:id' and validate 'status' field
router.put(
  "/:id",
  authMiddleware,
  menteeMiddleware,
  [
    param("id").isMongoId().withMessage("Invalid goal ID"),
    body("title").optional().notEmpty().withMessage("Title cannot be empty"),
    body("status")
      .optional()
      .isIn(["InProgress", "Completed"])
      .withMessage("Invalid status provided."),
  ],
  validateRequest,
  updateGoal
);

// FIX: Standardize parameter to '/:id'
router.delete(
  "/:id",
  authMiddleware,
  menteeMiddleware,
  [param("id").isMongoId().withMessage("Invalid goal ID")],
  validateRequest,
  deleteGoal
);

export default router;
