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
