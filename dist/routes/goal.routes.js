"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const goal_controller_1 = require("../controllers/goal.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const router = (0, express_1.Router)();
// This route now correctly uses menteeMiddleware
router.get("/", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, goal_controller_1.getAllMyGoals);
// This route is for viewing goals within a specific mentorship, accessible by both mentor and mentee
router.get("/:mentorshipId", auth_middleware_1.authMiddleware, [(0, express_validator_1.param)("mentorshipId").isMongoId().withMessage("Invalid mentorship ID")], validateRequest_1.validateRequest, goal_controller_1.getGoalsForMentorship);
// Create a new goal - This now correctly uses menteeMiddleware
router.post("/", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, // This was the missing piece
[
    (0, express_validator_1.body)("mentorshipRequestId")
        .isMongoId()
        .withMessage("A valid mentorship must be selected"),
    (0, express_validator_1.body)("title").notEmpty().withMessage("Goal title is required"),
    (0, express_validator_1.body)("specific").notEmpty().withMessage("The 'Specific' field is required"),
    (0, express_validator_1.body)("measurable")
        .notEmpty()
        .withMessage("The 'Measurable' field is required"),
    (0, express_validator_1.body)("achievable")
        .notEmpty()
        .withMessage("The 'Achievable' field is required"),
    (0, express_validator_1.body)("relevant").notEmpty().withMessage("The 'Relevant' field is required"),
    (0, express_validator_1.body)("timeBound")
        .notEmpty()
        .withMessage("The 'Time-bound' field is required"),
], validateRequest_1.validateRequest, goal_controller_1.createGoal);
// Update a goal - Only the mentee who owns the goal can update it
router.put("/:goalId", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, [
    (0, express_validator_1.param)("goalId").isMongoId().withMessage("Invalid goal ID"),
    (0, express_validator_1.body)("title").optional().notEmpty().withMessage("Title cannot be empty"),
    (0, express_validator_1.body)("isCompleted")
        .optional()
        .isBoolean()
        .withMessage("isCompleted must be a boolean"),
], validateRequest_1.validateRequest, goal_controller_1.updateGoal);
// Delete a goal - Only the mentee who owns the goal can delete it
router.delete("/:goalId", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, [(0, express_validator_1.param)("goalId").isMongoId().withMessage("Invalid goal ID")], validateRequest_1.validateRequest, goal_controller_1.deleteGoal);
exports.default = router;
