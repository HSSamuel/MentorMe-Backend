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
exports.seedLevels = exports.awardPoints = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const awardPoints = (userId, points) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = yield prisma.user.update({
        where: { id: userId },
        data: { points: { increment: points } },
        include: { level: true },
    });
    const nextLevel = yield prisma.level.findFirst({
        where: { minPoints: { gt: ((_a = user.level) === null || _a === void 0 ? void 0 : _a.minPoints) || 0 } },
        orderBy: { minPoints: "asc" },
    });
    if (nextLevel && user.points >= nextLevel.minPoints) {
        yield prisma.user.update({
            where: { id: userId },
            data: { levelId: nextLevel.id },
        });
    }
});
exports.awardPoints = awardPoints;
// Seed initial levels
const seedLevels = () => __awaiter(void 0, void 0, void 0, function* () {
    const existingLevels = yield prisma.level.count();
    if (existingLevels === 0) {
        yield prisma.level.createMany({
            data: [
                { name: "Beginner", minPoints: 0 },
                { name: "Intermediate", minPoints: 100 },
                { name: "Advanced", minPoints: 500 },
                { name: "Expert", minPoints: 1500 },
            ],
        });
    }
});
exports.seedLevels = seedLevels;
