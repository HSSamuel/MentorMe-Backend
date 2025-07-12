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
exports.sendPasswordResetEmail = exports.sendReminderEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../config")); // Import our new config loader
const transporter = nodemailer_1.default.createTransport({
    service: "Gmail",
    auth: {
        user: config_1.default.get("EMAIL"),
        pass: config_1.default.get("EMAIL_PASS"),
    },
});
const sendReminderEmail = (to, sessionTime) => __awaiter(void 0, void 0, void 0, function* () {
    const formattedTime = new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "short",
    }).format(sessionTime);
    yield transporter.sendMail({
        from: `"Mentor Platform" <${config_1.default.get("EMAIL")}>`,
        to,
        subject: "Upcoming Mentorship Session Reminder",
        html: `<p>Reminder: You have a session scheduled for ${formattedTime}</p>`,
    });
});
exports.sendReminderEmail = sendReminderEmail;
const sendPasswordResetEmail = (to, resetURL) => __awaiter(void 0, void 0, void 0, function* () {
    yield transporter.sendMail({
        from: `"Mentor Platform" <${config_1.default.get("EMAIL")}>`,
        to,
        subject: "Password Reset Request",
        html: `<p>You are receiving this email because you have requested the reset of the password for your account.</p>
           <p>Please click on the following link, or paste this into your browser to complete the process:</p>
           <p><a href="${resetURL}">${resetURL}</a></p>
           <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
    });
});
exports.sendPasswordResetEmail = sendPasswordResetEmail;
