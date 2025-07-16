"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const goal_controller_1 = require("../controllers/goal.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, goal_controller_1.getAllMyGoals);
// FIX: Standardize parameter to '/:id'
router.get("/mentorship/:id", auth_middleware_1.authMiddleware, [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid mentorship ID")], validateRequest_1.validateRequest, goal_controller_1.getGoalsForMentorship);
router.post("/", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, [
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
// FIX: Standardize parameter to '/:id' and validate 'status' field
router.put("/:id", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, [
    (0, express_validator_1.param)("id").isMongoId().withMessage("Invalid goal ID"),
    (0, express_validator_1.body)("title").optional().notEmpty().withMessage("Title cannot be empty"),
    (0, express_validator_1.body)("status")
        .optional()
        .isIn(["InProgress", "Completed"])
        .withMessage("Invalid status provided."),
], validateRequest_1.validateRequest, goal_controller_1.updateGoal);
// FIX: Standardize parameter to '/:id'
router.delete("/:id", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid goal ID")], validateRequest_1.validateRequest, goal_controller_1.deleteGoal);
exports.default = router;
