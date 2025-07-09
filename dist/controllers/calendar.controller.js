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
exports.googleAuthCallback = exports.googleAuth = void 0;
const calendar_service_1 = require("../services/calendar.service");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getUserId = (req) => {
    if (!req.user || !("userId" in req.user))
        return null;
    return req.user.userId;
};
/**
 * Redirects the user to the Google consent screen.
 */
const googleAuth = (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        // Corrected: Removed 'return'
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    const url = (0, calendar_service_1.generateAuthUrl)(userId);
    res.redirect(url);
};
exports.googleAuth = googleAuth;
/**
 * Handles the callback from Google after user grants permission.
 */
const googleAuthCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code, state } = req.query;
    const userId = state; // The userId we passed in the state
    if (!code) {
        // Corrected: Removed 'return'
        res.status(400).send("Error: Google did not return an authorization code.");
        return;
    }
    try {
        const tokens = yield (0, calendar_service_1.getTokensFromCode)(code);
        // Securely store the tokens in the database for the user
        yield prisma.user.update({
            where: { id: userId },
            data: {
                googleAccessToken: tokens.access_token,
                googleRefreshToken: tokens.refresh_token,
            },
        });
        // Redirect user to a success page or their profile settings
        res.redirect(`${process.env.FRONTEND_URL}/profile/edit?calendar=success`);
    }
    catch (error) {
        console.error("Error getting Google Calendar tokens:", error);
        res.status(500).send("Failed to authenticate with Google Calendar.");
    }
});
exports.googleAuthCallback = googleAuthCallback;
