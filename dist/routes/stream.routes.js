"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stream_controller_1 = require("../controllers/stream.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// A protected route to get a Stream token for the authenticated user
router.post("/token", auth_middleware_1.authMiddleware, stream_controller_1.createStreamToken);
exports.default = router;
