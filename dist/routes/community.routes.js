"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const community_controller_1 = require("../controllers/community.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validateRequest_1 = require("../middleware/validateRequest");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get("/", community_controller_1.getPosts);
router.get("/:postId", [(0, express_validator_1.param)("postId").isMongoId().withMessage("Invalid post ID.")], validateRequest_1.validateRequest, community_controller_1.getPostById);
router.post("/", [
    (0, express_validator_1.body)("title").notEmpty().withMessage("Title is required."),
    (0, express_validator_1.body)("content").notEmpty().withMessage("Content is required."),
], validateRequest_1.validateRequest, community_controller_1.createPost);
router.post("/:postId/comments", [
    (0, express_validator_1.param)("postId").isMongoId().withMessage("Invalid post ID."),
    (0, express_validator_1.body)("content").notEmpty().withMessage("Comment content is required."),
], validateRequest_1.validateRequest, community_controller_1.addComment);
exports.default = router;
