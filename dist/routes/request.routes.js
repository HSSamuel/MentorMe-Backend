"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mentor/Backend/src/routes/request.routes.ts
const express_1 = require("express");
const request_controller_1 = require("../controllers/request.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const router = (0, express_1.Router)();
// This route is correct
router.post("/", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, [(0, express_validator_1.body)("mentorId").notEmpty().withMessage("Mentor ID is required")], validateRequest_1.validateRequest, request_controller_1.createRequest);
// This route is correct
router.get("/sent", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, request_controller_1.getSentRequests);
// This route is correct
router.get("/received", auth_middleware_1.authMiddleware, auth_middleware_1.mentorMiddleware, request_controller_1.getReceivedRequests);
// FIX: Changed .isUUID() to .isMongoId()
router.put("/:id", auth_middleware_1.authMiddleware, auth_middleware_1.mentorMiddleware, [
    (0, express_validator_1.param)("id").isMongoId().withMessage("Invalid request ID"), // Changed from isUUID()
    (0, express_validator_1.body)("status").isIn(["ACCEPTED", "REJECTED"]).withMessage("Invalid status"),
], validateRequest_1.validateRequest, request_controller_1.updateRequestStatus);
exports.default = router;
