"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const fileUpload_middleware_1 = require("../middleware/fileUpload.middleware"); // Import the upload middleware
const router = (0, express_1.Router)();
// This is now the single endpoint for all profile updates, including the avatar.
router.put("/me/profile", auth_middleware_1.authMiddleware, fileUpload_middleware_1.upload.single("avatar"), // Use multer middleware here
[
    (0, express_validator_1.body)("name").notEmpty().withMessage("Name is required").trim().escape(),
    (0, express_validator_1.body)("bio").notEmpty().withMessage("Bio is required").trim().escape(),
    // Skills are now optional in the validation
    (0, express_validator_1.body)("skills").optional().isArray().withMessage("Skills must be an array"),
    (0, express_validator_1.body)("goals").notEmpty().withMessage("Goals are required").trim().escape(),
], validateRequest_1.validateRequest, user_controller_1.updateMyProfile);
// --- All other routes remain the same ---
router.get("/mentor/:id", [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid mentor ID")], validateRequest_1.validateRequest, user_controller_1.getMentorPublicProfile);
router.get("/mentor/:id/stats", auth_middleware_1.authMiddleware, user_controller_1.getMentorStats);
router.get("/mentee/stats", auth_middleware_1.authMiddleware, user_controller_1.getMenteeStats);
router.get("/mentors", auth_middleware_1.authMiddleware, user_controller_1.getAllMentors);
router.get("/skills", auth_middleware_1.authMiddleware, user_controller_1.getAvailableSkills);
exports.default = router;
