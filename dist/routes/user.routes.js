"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const fileUpload_middleware_1 = require("../middleware/fileUpload.middleware");
const router = (0, express_1.Router)();
router.put("/me/profile", auth_middleware_1.authMiddleware, fileUpload_middleware_1.upload.single("avatar"), [
    (0, express_validator_1.body)("name").notEmpty().withMessage("Name is required").trim().escape(),
    (0, express_validator_1.body)("bio").notEmpty().withMessage("Bio is required").trim().escape(),
    (0, express_validator_1.body)("skills").optional().isArray().withMessage("Skills must be an array"),
    (0, express_validator_1.body)("goals").notEmpty().withMessage("Goals are required").trim().escape(),
], validateRequest_1.validateRequest, user_controller_1.updateMyProfile);
router.get("/mentor/:id", [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid mentor ID")], validateRequest_1.validateRequest, user_controller_1.getMentorPublicProfile);
// Corrected route for mentor stats
router.get("/mentor/:id/stats", auth_middleware_1.authMiddleware, user_controller_1.getMentorStats);
// Corrected route for mentee stats
router.get("/mentee/stats", auth_middleware_1.authMiddleware, user_controller_1.getMenteeStats);
router.get("/mentors", auth_middleware_1.authMiddleware, user_controller_1.getAllMentors);
router.get("/skills", auth_middleware_1.authMiddleware, user_controller_1.getAvailableSkills);
router.get("/mentors/recommended", auth_middleware_1.authMiddleware, user_controller_1.getRecommendedMentors);
exports.default = router;
