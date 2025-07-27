"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// This line applies the authentication and admin checks to ALL routes in this file.
router.use(auth_middleware_1.authMiddleware, auth_middleware_1.adminMiddleware);
router.get("/dashboard", admin_controller_1.getDashboardData);
// Define the existing routes
router.get("/users", admin_controller_1.getAllUsers);
router.put("/users/:id/role", admin_controller_1.updateUserRole);
router.get("/matches", admin_controller_1.getAllMatches);
router.post("/matches", admin_controller_1.assignMentor);
router.get("/sessions", admin_controller_1.getAllSessions);
router.get("/stats", admin_controller_1.getStats);
router.delete("/requests/:id", admin_controller_1.deleteRequest);
router.put("/requests/:id/status", admin_controller_1.updateRequestStatus);
exports.default = router;
