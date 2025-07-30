import nodemailer from "nodemailer";
import config from "../config";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: config.get("EMAIL"),
    pass: config.get("EMAIL_PASS"),
  },
});

export const sendReminderEmail = async (to: string, sessionTime: Date) => {
  const formattedTime = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(sessionTime);

  await transporter.sendMail({
    from: `"MentorMe" <${config.get("EMAIL")}>`,
    to,
    subject: "Upcoming Mentorship Session Reminder",
    html: `<p>Reminder: You have a session scheduled for ${formattedTime}</p>`,
  });
};

export const sendPasswordResetEmail = async (to: string, resetURL: string) => {
  await transporter.sendMail({
    from: `"MentorMe" <${config.get("EMAIL")}>`,
    to,
    subject: "Password Reset Request",
    html: `<p>You are receiving this email because you have requested the reset of the password for your account.</p>
           <p>Please click on the following link, or paste this into your browser to complete the process:</p>
           <p><a href="${resetURL}">${resetURL}</a></p>
           <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
  });
};

// --- Function to notify mentor of a new request ---
export const sendNewRequestEmail = async (
  mentorEmail: string,
  menteeName: string,
  mentorName: string
) => {
  const loginUrl = `${config.get("FRONTEND_URL")}/login`;
  const mailOptions = {
    from: `"MentorMe" <${config.get("EMAIL")}>`,
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
