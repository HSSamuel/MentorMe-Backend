"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_facebook_1 = require("passport-facebook");
const client_1 = __importDefault(require("../client"));
const stream_controller_1 = require("../controllers/stream.controller");
// Google Strategy
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    scope: ["profile", "email"],
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const userEmail = profile.emails?.[0].value;
        const googleId = profile.id;
        const displayName = profile.displayName;
        const avatarUrl = profile.photos?.[0].value;
        // Ensure an email address is returned from Google, which is required by your schema.
        if (!userEmail) {
            return done(new Error("No email address found from Google profile."), false);
        }
        // 1. Find user by their unique Google ID first. This handles a returning user.
        let user = await client_1.default.user.findFirst({
            where: { googleId: googleId },
        });
        if (user) {
            // If user is found, this is a login. Return the user.
            return done(null, user);
        }
        // 2. If no user with that Google ID, check if the email is already in use.
        // This handles a user who first signed up with email/password and now uses Google.
        user = await client_1.default.user.findUnique({
            where: { email: userEmail },
        });
        if (user) {
            // User exists, so link their Google ID to the existing account.
            user = await client_1.default.user.update({
                where: { id: user.id },
                data: { googleId: googleId },
            });
            return done(null, user);
        }
        // 3. If no user is found by Google ID or email, it's a new user. Create them.
        const newUser = await client_1.default.user.create({
            data: {
                email: userEmail,
                googleId: googleId,
                profile: {
                    create: {
                        name: displayName,
                        avatarUrl: avatarUrl,
                    },
                },
            },
        });
        // --- [NEW] Create the new user in Stream ---
        try {
            await stream_controller_1.streamClient.upsertUser({
                id: newUser.id,
                name: displayName,
                image: avatarUrl,
                role: "user", // Default role for OAuth users
            });
        }
        catch (chatError) {
            console.error("Error creating Google user in Stream:", chatError);
        }
        // --- End of Stream user creation ---
        return done(null, newUser);
    }
    catch (error) {
        return done(error, false);
    }
}));
// Facebook Strategy with the same robust logic
passport_1.default.use(new passport_facebook_1.Strategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/api/auth/facebook/callback",
    profileFields: ["id", "displayName", "emails", "photos"],
    enableProof: true,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const userEmail = profile.emails?.[0].value;
        const displayName = profile.displayName;
        const avatarUrl = profile.photos?.[0].value;
        if (!userEmail) {
            return done(new Error("No email address found from Facebook profile."), false);
        }
        let user = await client_1.default.user.findFirst({
            where: { facebookId: profile.id },
        });
        if (user) {
            return done(null, user);
        }
        user = await client_1.default.user.findUnique({
            where: { email: userEmail },
        });
        if (user) {
            user = await client_1.default.user.update({
                where: { id: user.id },
                data: { facebookId: profile.id },
            });
            return done(null, user);
        }
        const newUser = await client_1.default.user.create({
            data: {
                email: userEmail,
                facebookId: profile.id,
                profile: {
                    create: {
                        name: displayName,
                        avatarUrl: avatarUrl,
                    },
                },
            },
        });
        // --- [NEW] Create the new user in Stream ---
        try {
            await stream_controller_1.streamClient.upsertUser({
                id: newUser.id,
                name: displayName,
                image: avatarUrl,
                role: "user",
            });
        }
        catch (chatError) {
            console.error("Error creating Facebook user in Stream:", chatError);
        }
        // --- End of Stream user creation ---
        return done(null, newUser);
    }
    catch (error) {
        return done(error, false);
    }
}));
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await client_1.default.user.findUnique({ where: { id: id } });
        done(null, user);
    }
    catch (error) {
        done(error, false);
    }
});
