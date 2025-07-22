"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedLevels = exports.awardPoints = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const awardPoints = async (userId, points) => {
    const user = await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: points } },
        include: { level: true },
    });
    const nextLevel = await prisma.level.findFirst({
        where: { minPoints: { gt: user.level?.minPoints || 0 } },
        orderBy: { minPoints: "asc" },
    });
    if (nextLevel && user.points >= nextLevel.minPoints) {
        await prisma.user.update({
            where: { id: userId },
            data: { levelId: nextLevel.id },
        });
    }
};
exports.awardPoints = awardPoints;
// Seed initial levels
const seedLevels = async () => {
    const existingLevels = await prisma.level.count();
    if (existingLevels === 0) {
        await prisma.level.createMany({
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
