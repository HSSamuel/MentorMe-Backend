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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zxcvbn_1 = __importDefault(require("zxcvbn"));
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";
// Helper function to safely get userId from either JWT payload or Passport user object
const getUserId = (req) => {
    if (!req.user)
        return null;
    if ("userId" in req.user)
        return req.user.userId; // From JWT
    if ("id" in req.user)
        return req.user.id; // From Passport/Prisma
    return null;
};
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, role } = req.body;
    const passwordStrength = (0, zxcvbn_1.default)(password);
    if (passwordStrength.score < 3) {
        res.status(400).json({
            message: "Password is too weak. Please choose a stronger password.",
            suggestions: passwordStrength.feedback.suggestions,
        });
        return;
    }
    try {
        const hashedPassword = yield bcryptjs_1.default.hash(password, 12);
        // Create both the user and their profile in a single transaction
        const user = yield prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
                profile: {
                    create: {
                        name: email.split("@")[0], // Use the part of the email before the @ as a default name
                    },
                },
            },
            include: {
                profile: true, // Include the new profile in the response
            },
        });
        const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
        res.status(201).json(userWithoutPassword);
    }
    catch (error) {
        console.error("Registration Error:", error); // Log the actual error to the console
        res.status(500).json({ message: "Server error during registration" });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield prisma.user.findUnique({ where: { email } });
        // Corrected logic: check for user and user.password existence
        if (!user ||
            !user.password ||
            !(yield bcryptjs_1.default.compare(password, user.password))) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role, email: user.email }, JWT_SECRET, {
            expiresIn: "1d",
        });
        res.status(200).json({ token });
    }
    catch (error) {
        res.status(500).json({ message: "Server error during login" });
    }
});
exports.login = login;
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).json({ message: "Authentication error" });
        return;
    }
    try {
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            // Corrected: Added googleAccessToken and googleRefreshToken to the select query
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
});
exports.getMe = getMe;
