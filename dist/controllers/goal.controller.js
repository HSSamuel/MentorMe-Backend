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
const getUserId_1 = require("../utils/getUserId");
const prisma = new client_1.PrismaClient();
// GET goals for a specific mentorship
const getGoalsForMentorship = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    const { mentorshipId } = req.params;
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
    const userId = (0, getUserId_1.getUserId)(req);
    const { mentorshipRequestId, title, description, category, dueDate, specific, measurable, achievable, relevant, timeBound, } = req.body;
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
            data: {
                title,
                description: description || "",
                category: category || "General",
                dueDate: dueDate ? new Date(dueDate) : null,
                specific: specific || "",
                measurable: measurable || "",
                achievable: achievable || "",
                relevant: relevant || "",
                timeBound: timeBound || "",
                status: "InProgress",
                mentorshipRequest: {
                    connect: { id: mentorshipRequestId },
                },
            },
        });
        res.status(201).json(newGoal);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error creating goal." });
    }
});
exports.createGoal = createGoal;
// The only function that needs to be checked is updateGoal
const updateGoal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    const { goalId } = req.params;
    const { title, description, isCompleted } = req.body;
    const io = req.app.locals.io; // Access io from the request object
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const goal = yield prisma.goal.findFirst({
            where: {
                id: goalId,
                mentorshipRequest: {
                    menteeId: userId,
                },
            },
            include: { mentorshipRequest: true },
        });
        if (!goal) {
            res
                .status(404)
                .json({ message: "Goal not found or you are not the mentee." });
            return;
        }
        const updatedGoal = yield prisma.goal.update({
            where: { id: goalId },
            data: { title, description, isCompleted },
        });
        if (isCompleted) {
            io.emit("goalCompleted", {
                goalId: updatedGoal.id,
                menteeId: userId,
                mentorId: goal.mentorshipRequest.mentorId,
            });
        }
        res.status(200).json(updatedGoal);
    }
    catch (error) {
        res.status(500).json({ message: "Server error updating goal." });
    }
});
exports.updateGoal = updateGoal;
// DELETE a goal
const deleteGoal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, getUserId_1.getUserId)(req);
    const { goalId } = req.params;
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const goal = yield prisma.goal.findFirst({
            where: {
                id: goalId,
                mentorshipRequest: {
                    menteeId: userId,
                },
            },
        });
        if (!goal) {
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
