"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zxcvbn_1 = __importDefault(require("zxcvbn"));
const crypto_1 = __importDefault(require("crypto"));
const email_service_1 = require("../services/email.service");
const config_1 = __importDefault(require("../config"));
const client_1 = __importDefault(require("../client"));
const stream_chat_1 = require("stream-chat");
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";
const streamClient = stream_chat_1.StreamChat.getInstance(process.env.STREAM_API_KEY, process.env.STREAM_API_SECRET);
const getUserId = (req) => {
    if (!req.user)
        return null;
    if ("userId" in req.user)
        return req.user.userId;
    if ("id" in req.user)
        return req.user.id;
    return null;
};
const register = async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const existingUser = await client_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            res
                .status(409)
                .json({ message: "A user with this email address already exists." });
            return;
        }
        const passwordStrength = (0, zxcvbn_1.default)(password);
        if (passwordStrength.score < 3) {
            res.status(400).json({
                message: "Password is too weak. Please choose a stronger password.",
                suggestions: passwordStrength.feedback.suggestions,
            });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await client_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
                profile: {
                    create: {
                        name: email.split("@")[0],
                    },
                },
            },
            include: {
                profile: true,
            },
        });
        try {
            await streamClient.upsertUser({
                id: user.id,
                name: user.profile?.name || user.email.split("@")[0],
                role: user.role.toLowerCase(),
                image: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.profile?.name || user.email)}&background=random&color=fff`,
            });
            console.log(`User ${user.id} created successfully in Stream Chat.`);
        }
        catch (chatError) {
            console.error("Error creating user in Stream Chat:", chatError);
        }
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    }
    catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: "Server error during registration" });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // --- [MODIFIED] Include the user's profile in the query ---
        const user = await client_1.default.user.findUnique({
            where: { email },
            include: { profile: true },
        });
        if (!user ||
            !user.password ||
            !(await bcryptjs_1.default.compare(password, user.password))) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        // --- [ADDED] Sync user to Stream Chat on every login ---
        // This ensures all existing users are created in Stream.
        try {
            await streamClient.upsertUser({
                id: user.id,
                name: user.profile?.name || user.email.split("@")[0],
                role: user.role.toLowerCase(),
                image: user.profile?.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.profile?.name || user.email)}&background=random&color=fff`,
            });
            console.log(`User ${user.id} synced to Stream Chat on login.`);
        }
        catch (chatError) {
            console.error("Error syncing user to Stream Chat during login:", chatError);
        }
        // --- End of Stream Chat user sync ---
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role, email: user.email }, JWT_SECRET, {
            expiresIn: "1d",
        });
        res.status(200).json({ token });
    }
    catch (error) {
        res.status(500).json({ message: "Server error during login" });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                profile: true,
                googleAccessToken: true,
                googleRefreshToken: true,
            },
        });
        res.status(200).json(user);
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.getMe = getMe;
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await client_1.default.user.findUnique({ where: { email } });
        if (!user) {
            res.status(200).json({
                message: "If a user with that email exists, a password reset link has been sent.",
            });
            return;
        }
        const resetToken = crypto_1.default.randomBytes(32).toString("hex");
        const passwordResetToken = crypto_1.default
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");
        const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
        await client_1.default.user.update({
            where: { email },
            data: {
                passwordResetToken,
                passwordResetExpires,
            },
        });
        const resetURL = `${config_1.default.get("FRONTEND_URL")}/reset-password/${resetToken}`;
        await (0, email_service_1.sendPasswordResetEmail)(user.email, resetURL);
        res.status(200).json({
            message: "If a user with that email exists, a password reset link has been sent.",
        });
    }
    catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        const hashedToken = crypto_1.default.createHash("sha256").update(token).digest("hex");
        const user = await client_1.default.user.findFirst({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpires: { gt: new Date() },
            },
        });
        if (!user) {
            res.status(400).json({ message: "Token is invalid or has expired" });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        await client_1.default.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        });
        res.status(200).json({ message: "Password has been reset." });
    }
    catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.resetPassword = resetPassword;
