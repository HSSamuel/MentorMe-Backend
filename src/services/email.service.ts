import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendReminderEmail = async (to: string, sessionTime: Date) => {
  const formattedTime = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(sessionTime);

  await transporter.sendMail({
    from: `"Mentor Platform" <${process.env.EMAIL}>`,
    to,
    subject: "Upcoming Mentorship Session Reminder",
    html: `<p>Reminder: You have a session scheduled for ${formattedTime}</p>`,
  });
};

export const sendPasswordResetEmail = async (to: string, resetURL: string) => {
  await transporter.sendMail({
    from: `"Mentor Platform" <${process.env.EMAIL}>`,
    to,
    subject: "Password Reset Request",
    html: `<p>You are receiving this email because you (or someone else) have requested the reset of the password for your account.</p>
           <p>Please click on the following link, or paste this into your browser to complete the process:</p>
           <p><a href="${resetURL}">${resetURL}</a></p>
           <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
  });
};