"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const resource_controller_1 = require("../controllers/resource.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const router = (0, express_1.Router)();
// --- Public Routes ---
router.get("/", resource_controller_1.getAllResources);
// --- Authenticated User Routes ---
router.get("/recommended", auth_middleware_1.authMiddleware, resource_controller_1.getRecommendedResources);
// --- Admin-Only Routes ---
router.post("/", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, [
    (0, express_validator_1.body)("title").notEmpty().withMessage("Title is required"),
    (0, express_validator_1.body)("description").notEmpty().withMessage("Description is required"),
    (0, express_validator_1.body)("link").isURL().withMessage("A valid link is required"),
    (0, express_validator_1.body)("type").isIn([
        "ARTICLE",
        "VIDEO",
        "COURSE",
        "BOOK",
        "PODCAST",
        "OTHER",
    ]),
], validateRequest_1.validateRequest, resource_controller_1.createResource);
router.put("/:id", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid resource ID")], validateRequest_1.validateRequest, resource_controller_1.updateResource);
router.delete("/:id", auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware, [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid resource ID")], validateRequest_1.validateRequest, resource_controller_1.deleteResource);
exports.default = router;
