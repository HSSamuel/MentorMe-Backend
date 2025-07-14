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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_facebook_1 = require("passport-facebook");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Google Strategy
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    scope: ["profile", "email"],
}, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userEmail = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0].value;
        const googleId = profile.id;
        const displayName = profile.displayName;
        // Ensure an email address is returned from Google, which is required by your schema.
        if (!userEmail) {
            return done(new Error("No email address found from Google profile."), false);
        }
        // 1. Find user by their unique Google ID first. This handles a returning user.
        let user = yield prisma.user.findUnique({
            where: { googleId: googleId },
        });
        if (user) {
            // If user is found, this is a login. Return the user.
            return done(null, user);
        }
        // 2. If no user with that Google ID, check if the email is already in use.
        // This handles a user who first signed up with email/password and now uses Google.
        user = yield prisma.user.findUnique({
            where: { email: userEmail },
        });
        if (user) {
            // User exists, so link their Google ID to the existing account.
            user = yield prisma.user.update({
                where: { id: user.id },
                data: { googleId: googleId },
            });
            return done(null, user);
        }
        // 3. If no user is found by Google ID or email, it's a new user. Create them.
        const newUser = yield prisma.user.create({
            data: {
                email: userEmail,
                googleId: googleId,
                profile: {
                    create: {
                        name: displayName,
                    },
                },
            },
        });
        return done(null, newUser);
    }
    catch (error) {
        return done(error, false);
    }
})));
// Facebook Strategy with the same robust logic
passport_1.default.use(new passport_facebook_1.Strategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/api/auth/facebook/callback",
    profileFields: ["id", "displayName", "emails"],
    enableProof: true,
}, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userEmail = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0].value;
        if (!userEmail) {
            return done(new Error("No email address found from Facebook profile."), false);
        }
        let user = yield prisma.user.findUnique({
            where: { facebookId: profile.id },
        });
        if (user) {
            return done(null, user);
        }
        user = yield prisma.user.findUnique({
            where: { email: userEmail },
        });
        if (user) {
            user = yield prisma.user.update({
                where: { id: user.id },
                data: { facebookId: profile.id },
            });
            return done(null, user);
        }
        const newUser = yield prisma.user.create({
            data: {
                email: userEmail,
                facebookId: profile.id,
                profile: {
                    create: {
                        name: profile.displayName,
                    },
                },
            },
        });
        return done(null, newUser);
    }
    catch (error) {
        return done(error, false);
    }
})));
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser((id, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma.user.findUnique({ where: { id: id } });
        done(null, user);
    }
    catch (error) {
        done(error, false);
    }
}));
