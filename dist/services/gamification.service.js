"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedLevels = exports.awardPoints = void 0;
const client_1 = __importDefault(require("../client"));
const awardPoints = async (userId, points) => {
    const user = await client_1.default.user.update({
        where: { id: userId },
        data: { points: { increment: points } },
        include: { level: true },
    });
    const nextLevel = await client_1.default.level.findFirst({
        where: { minPoints: { gt: user.level?.minPoints || 0 } },
        orderBy: { minPoints: "asc" },
    });
    if (nextLevel && user.points >= nextLevel.minPoints) {
        await client_1.default.user.update({
            where: { id: userId },
            data: { levelId: nextLevel.id },
        });
    }
};
exports.awardPoints = awardPoints;
// Seed initial levels
const seedLevels = async () => {
    const existingLevels = await client_1.default.level.count();
    if (existingLevels === 0) {
        await client_1.default.level.createMany({
            data: [
                { name: "Beginner", minPoints: 0 },
                { name: "Intermediate", minPoints: 100 },
                { name: "Advanced", minPoints: 500 },
                { name: "Expert", minPoints: 1500 },
            ],
        });
    }
};
exports.seedLevels = seedLevels;
