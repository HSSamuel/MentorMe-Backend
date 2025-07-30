"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewRequestEmail = exports.sendPasswordResetEmail = exports.sendReminderEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../config")); // Import our new config loader
const transporter = nodemailer_1.default.createTransport({
    service: "Gmail",
    auth: {
        user: config_1.default.get("EMAIL"),
        pass: config_1.default.get("EMAIL_PASS"),
    },
});
const sendReminderEmail = async (to, sessionTime) => {
    const formattedTime = new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "short",
    }).format(sessionTime);
    await transporter.sendMail({
        from: `"MentorMe" <${config_1.default.get("EMAIL")}>`,
        to,
        subject: "Upcoming Mentorship Session Reminder",
        html: `<p>Reminder: You have a session scheduled for ${formattedTime}</p>`,
    });
};
exports.sendReminderEmail = sendReminderEmail;
const sendPasswordResetEmail = async (to, resetURL) => {
    await transporter.sendMail({
        from: `"MentorMe" <${config_1.default.get("EMAIL")}>`,
        to,
        subject: "Password Reset Request",
        html: `<p>You are receiving this email because you have requested the reset of the password for your account.</p>
           <p>Please click on the following link, or paste this into your browser to complete the process:</p>
           <p><a href="${resetURL}">${resetURL}</a></p>
           <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
    });
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
// --- ADDED: New function to notify mentor of a new request ---
const sendNewRequestEmail = async (mentorEmail, menteeName, mentorName) => {
    const loginUrl = `${config_1.default.get("FRONTEND_URL")}/login`; // Assumes you have a FRONTEND_URL in your config
    const mailOptions = {
        from: `"MentorMe" <${config_1.default.get("EMAIL")}>`,
        to: mentorEmail,
        subject: "You Have a New Mentorship Request!",
        html: `<p>Hi ${mentorName},</p>
           <p>You have a new mentorship request from <b>${menteeName}</b> on the MentorMe platform.</p>
           <p>Please log in to your account to review the request and respond.</p>
           <p><a href="${loginUrl}" style="padding: 10px 15px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">View Request Now</a></p>
           <p>Thank you for being a mentor!</p>`,
    };
    await transporter.sendMail(mailOptions);
};
exports.sendNewRequestEmail = sendNewRequestEmail;
