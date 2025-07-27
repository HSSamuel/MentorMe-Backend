"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const calendar_controller_1 = require("../controllers/calendar.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Redirects user to Google to grant calendar access
router.get("/google", auth_middleware_1.authMiddleware, calendar_controller_1.googleAuth);
// The callback URL that Google will redirect to
router.get("/google/callback", calendar_controller_1.googleAuthCallback);
exports.default = router;
