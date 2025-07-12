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
        let user = yield prisma.user.findUnique({
            where: { email: (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0].value },
        });
        if (user) {
            // User exists, link googleId if not present
            if (!user.googleId) {
                user = yield prisma.user.update({
                    where: { id: user.id },
                    data: { googleId: profile.id },
                });
            }
            return done(null, user);
        }
        // Create new user
        const newUser = yield prisma.user.create({
            data: {
                email: profile.emails[0].value,
                googleId: profile.id,
                // Assuming the password can be null for social logins
                // You might need to adjust your Prisma schema for this
            },
        });
        // Create a basic profile for the new user
        yield prisma.profile.create({
            data: {
                userId: newUser.id,
                name: profile.displayName,
            },
        });
        return done(null, newUser);
    }
    catch (error) {
        return done(error, false);
    }
})));
// Facebook Strategy with enableProof
passport_1.default.use(new passport_facebook_1.Strategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/api/auth/facebook/callback",
    profileFields: ["id", "displayName", "emails"],
    enableProof: true, // Add this line
}, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let user = yield prisma.user.findUnique({
            where: { email: (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0].value },
        });
        if (user) {
            // User exists, link facebookId if not present
            if (!user.facebookId) {
                user = yield prisma.user.update({
                    where: { id: user.id },
                    data: { facebookId: profile.id },
                });
            }
            return done(null, user);
        }
        // Create new user
        const newUser = yield prisma.user.create({
            data: {
                email: profile.emails[0].value,
                facebookId: profile.id,
            },
        });
        // Create a basic profile for the new user
        yield prisma.profile.create({
            data: {
                userId: newUser.id,
                name: profile.displayName,
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
