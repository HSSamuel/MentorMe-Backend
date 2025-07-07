"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewsForMentor = exports.createReview = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getUserId = (req) => {
    if (!req.user || !("userId" in req.user))
        return null;
    return req.user.userId;
};
// POST /reviews
const createReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    const { mentorshipRequestId, rating, comment } = req.body;
    if (!userId) {
        // Corrected: Removed 'return'
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        // Verify that the user is the mentee of this specific mentorship request
        const mentorship = yield prisma.mentorshipRequest.findFirst({
            where: {
                id: mentorshipRequestId,
                menteeId: userId,
                status: "ACCEPTED", // Can only review accepted mentorships
            },
        });
        if (!mentorship) {
            // Corrected: Removed 'return'
            res
                .status(403)
                .json({ message: "You are not authorized to review this mentorship." });
            return;
        }
        // Check if a review for this mentorship already exists
        const existingReview = yield prisma.review.findFirst({
            where: { mentorshipRequestId },
        });
        if (existingReview) {
            // Corrected: Removed 'return'
            res
                .status(400)
                .json({ message: "A review for this mentorship already exists." });
            return;
        }
        const newReview = yield prisma.review.create({
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
});
exports.createReview = createReview;
// GET /reviews/mentor/:mentorId
const getReviewsForMentor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { mentorId } = req.params;
    try {
        const reviews = yield prisma.review.findMany({
            where: {
                mentorshipRequest: {
                    mentorId: mentorId,
                },
            },
            include: {
                mentorshipRequest: {
                    select: {
                        mentee: {
                            select: {
                                profile: {
                                    select: { name: true },
                                },
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
});
exports.getReviewsForMentor = getReviewsForMentor;
