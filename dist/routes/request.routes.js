"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
// FIX: Add the new route to check the status of a request with a specific mentor
router.get("/status/:mentorId", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, [(0, express_validator_1.param)("mentorId").isMongoId().withMessage("Invalid mentor ID")], validateRequest_1.validateRequest, request_controller_1.getRequestStatusWithMentor);
router.put("/:id", auth_middleware_1.authMiddleware, auth_middleware_1.mentorMiddleware, [
    (0, express_validator_1.param)("id").isMongoId().withMessage("Invalid request ID"),
    (0, express_validator_1.body)("status").isIn(["ACCEPTED", "REJECTED"]).withMessage("Invalid status"),
], validateRequest_1.validateRequest, request_controller_1.updateRequestStatus);
exports.default = router;
