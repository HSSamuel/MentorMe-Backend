"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_controller_1 = require("../controllers/review.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validateRequest_1 = require("../middleware/validateRequest");
const router = (0, express_1.Router)();
// POST /api/reviews/
// This route allows an authenticated mentee to create a new review for a mentorship.
router.post("/", auth_middleware_1.authMiddleware, auth_middleware_1.menteeMiddleware, [
    (0, express_validator_1.body)("mentorshipRequestId")
        .isMongoId()
        .withMessage("Invalid mentorship request ID"),
    (0, express_validator_1.body)("rating")
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be an integer between 1 and 5"),
    (0, express_validator_1.body)("comment").notEmpty().withMessage("Comment is required"),
], validateRequest_1.validateRequest, review_controller_1.createReview);
// GET /api/reviews/mentor/:mentorId
// This route is public and fetches all reviews for a specific mentor's profile.
// It correctly points to the getReviewsForMentor function we updated.
router.get("/mentor/:mentorId", [(0, express_validator_1.param)("mentorId").isMongoId().withMessage("Invalid mentor ID")], validateRequest_1.validateRequest, review_controller_1.getReviewsForMentor);
exports.default = router;
