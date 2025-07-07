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
exports.deleteGoal = exports.updateGoal = exports.createGoal = exports.getGoalsForMentorship = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getUserId = (req) => {
    if (!req.user || !("userId" in req.user))
        return null;
    return req.user.userId;
};
// GET goals for a specific mentorship
const getGoalsForMentorship = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    const { mentorshipId } = req.params;
    // Added check: Ensure user is authenticated before proceeding.
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const mentorship = yield prisma.mentorshipRequest.findFirst({
            where: {
                id: mentorshipId,
                OR: [{ menteeId: userId }, { mentorId: userId }],
            },
        });
        if (!mentorship) {
            res
                .status(404)
                .json({ message: "Mentorship not found or access denied." });
            return;
        }
        const goals = yield prisma.goal.findMany({
            where: { mentorshipRequestId: mentorshipId },
            orderBy: { createdAt: "asc" },
        });
        res.status(200).json(goals);
    }
    catch (error) {
        res.status(500).json({ message: "Server error fetching goals." });
    }
});
exports.getGoalsForMentorship = getGoalsForMentorship;
// POST a new goal
const createGoal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    const { mentorshipRequestId, title, description } = req.body;
    // Added check: Ensure user is authenticated before proceeding.
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const mentorship = yield prisma.mentorshipRequest.findFirst({
            where: {
                id: mentorshipRequestId,
                menteeId: userId, // Only the mentee can create goals
            },
        });
        if (!mentorship) {
            res
                .status(404)
                .json({ message: "Mentorship not found or you are not the mentee." });
            return;
        }
        const newGoal = yield prisma.goal.create({
            data: { mentorshipRequestId, title, description },
        });
        res.status(201).json(newGoal);
    }
    catch (error) {
        res.status(500).json({ message: "Server error creating goal." });
    }
});
exports.createGoal = createGoal;
// PUT (update) a goal
const updateGoal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    const { goalId } = req.params;
    const { title, description, isCompleted } = req.body;
    // Added check: Ensure user is authenticated before proceeding.
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const goal = yield prisma.goal.findUnique({
            where: { id: goalId },
            include: { mentorshipRequest: true },
        });
        if (!goal || goal.mentorshipRequest.menteeId !== userId) {
            res
                .status(404)
                .json({ message: "Goal not found or you are not the mentee." });
            return;
        }
        const updatedGoal = yield prisma.goal.update({
            where: { id: goalId },
            data: { title, description, isCompleted },
        });
        res.status(200).json(updatedGoal);
    }
    catch (error) {
        res.status(500).json({ message: "Server error updating goal." });
    }
});
exports.updateGoal = updateGoal;
// DELETE a goal
const deleteGoal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    const { goalId } = req.params;
    // Added check: Ensure user is authenticated before proceeding.
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const goal = yield prisma.goal.findUnique({
            where: { id: goalId },
            include: { mentorshipRequest: true },
        });
        if (!goal || goal.mentorshipRequest.menteeId !== userId) {
            res
                .status(404)
                .json({ message: "Goal not found or you are not the mentee." });
            return;
        }
        yield prisma.goal.delete({
            where: { id: goalId },
        });
        res.status(204).send(); // No content
    }
    catch (error) {
        res.status(500).json({ message: "Server error deleting goal." });
    }
});
exports.deleteGoal = deleteGoal;
