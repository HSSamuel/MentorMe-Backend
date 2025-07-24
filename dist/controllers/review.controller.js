"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewsForMentor = exports.createReview = void 0;
const client_1 = __importDefault(require("../client"));
const getUserId = (req) => {
    if (!req.user || !("userId" in req.user))
        return null;
    return req.user.userId;
};
// POST /reviews
const createReview = async (req, res) => {
    const userId = getUserId(req);
    const { mentorshipRequestId, rating, comment } = req.body;
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        // Verify that the user is the mentee of this specific mentorship request
        const mentorship = await client_1.default.mentorshipRequest.findFirst({
            where: {
                id: mentorshipRequestId,
                menteeId: userId,
                status: "ACCEPTED", // Can only review accepted mentorships
            },
        });
        if (!mentorship) {
            res
                .status(403)
                .json({ message: "You are not authorized to review this mentorship." });
            return;
        }
        // Check if a review for this mentorship already exists
        const existingReview = await client_1.default.review.findFirst({
            where: { mentorshipRequestId },
        });
        if (existingReview) {
            res
                .status(400)
                .json({ message: "A review for this mentorship already exists." });
            return;
        }
        const newReview = await client_1.default.review.create({
            data: {
                mentorshipRequestId,
                rating,
                comment,
            },
        });
        res.status(201).json(newReview);
    }
    catch (error) {
        console.error("Error creating review:", error);
        res.status(500).json({ message: "Server error while creating review." });
    }
};
exports.createReview = createReview;
// GET /reviews/mentor/:mentorId
const getReviewsForMentor = async (req, res) => {
    const { mentorId } = req.params;
    try {
        const reviews = await client_1.default.review.findMany({
            where: {
                mentorshipRequest: {
                    mentorId: mentorId,
                },
            },
            // --- [THE FIX] ---
            // This 'include' is updated to fetch the mentee's full profile (including avatar),
            // which is needed by the frontend to display the review correctly.
            include: {
                mentorshipRequest: {
                    select: {
                        mentee: {
                            select: {
                                profile: true, // Fetches the entire profile
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.status(200).json(reviews);
    }
    catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({ message: "Server error while fetching reviews." });
    }
};
exports.getReviewsForMentor = getReviewsForMentor;
