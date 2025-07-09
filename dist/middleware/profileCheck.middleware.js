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
exports.ensureProfileComplete = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const ensureProfileComplete = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // First, ensure the user object and its ID exist on the request.
    if (!req.user || !req.user.userId) {
        return res
            .status(401)
            .json({ message: "Authentication error. User not found." });
    }
    try {
        const userId = req.user.userId;
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });
        if (!user) {
            return res.status(404).json({ message: "User profile not found." });
        }
        const profile = user.profile;
        // Check if the profile and its essential fields are present.
        if (!profile ||
            !profile.name ||
            !profile.bio ||
            !((_a = profile.skills) === null || _a === void 0 ? void 0 : _a.length) ||
            !profile.goals) {
            return res
                .status(403)
                .json({
                message: "Your profile is incomplete. Please update it to continue.",
            });
        }
        next();
    }
    catch (error) {
        console.error("Profile check error:", error);
        return res
            .status(500)
            .json({ message: "An error occurred while checking your profile." });
    }
});
exports.ensureProfileComplete = ensureProfileComplete;
