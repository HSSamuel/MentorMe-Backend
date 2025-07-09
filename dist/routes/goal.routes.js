"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const goal_controller_1 = require("../controllers/goal.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const router = (0, express_1.Router)();
// Get all goals for a specific mentorship
router.get("/:mentorshipId", auth_middleware_1.authMiddleware, [(0, express_validator_1.param)("mentorshipId").isMongoId().withMessage("Invalid mentorship ID")], validateRequest_1.validateRequest, goal_controller_1.getGoalsForMentorship);
// Create a new goal
router.post("/", auth_middleware_1.authMiddleware, [
    (0, express_validator_1.body)("mentorshipRequestId")
        .isMongoId()
        .withMessage("Invalid mentorship ID"),
    (0, express_validator_1.body)("title").notEmpty().withMessage("Goal title is required"),
], validateRequest_1.validateRequest, goal_controller_1.createGoal);
// Update a goal
router.put("/:goalId", auth_middleware_1.authMiddleware, [
    (0, express_validator_1.param)("goalId").isMongoId().withMessage("Invalid goal ID"),
    (0, express_validator_1.body)("title").optional().notEmpty().withMessage("Title cannot be empty"),
    (0, express_validator_1.body)("isCompleted")
        .optional()
        .isBoolean()
        .withMessage("isCompleted must be a boolean"),
], validateRequest_1.validateRequest, goal_controller_1.updateGoal);
// Delete a goal
router.delete("/:goalId", auth_middleware_1.authMiddleware, [(0, express_validator_1.param)("goalId").isMongoId().withMessage("Invalid goal ID")], validateRequest_1.validateRequest, goal_controller_1.deleteGoal);
exports.default = router;
