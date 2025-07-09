"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const router = (0, express_1.Router)();
// Get all notifications for the logged-in user
router.get("/", auth_middleware_1.authMiddleware, notification_controller_1.getNotifications);
// Mark all notifications as read
router.put("/read-all", auth_middleware_1.authMiddleware, notification_controller_1.markAllAsRead);
// Mark a single notification as read
router.put("/:id/read", auth_middleware_1.authMiddleware, [(0, express_validator_1.param)("id").isMongoId().withMessage("Invalid notification ID")], validateRequest_1.validateRequest, notification_controller_1.markAsRead);
exports.default = router;
