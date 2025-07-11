// Mentor/Backend/src/services/email.service.ts
import { Resend } from "resend";

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = "MentorMe Platform <onboarding@resend.dev>"; // Use the Resend sandbox email

export const sendReminderEmail = async (to: string, sessionTime: Date) => {
  const formattedTime = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(sessionTime);

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Upcoming Mentorship Session Reminder",
      html: `<p>Reminder: You have a session scheduled for ${formattedTime}</p>`,
    });
  } catch (error) {
    console.error("Error sending reminder email:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

export const sendPasswordResetEmail = async (to: string, resetURL: string) => {
  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Password Reset Request",
      html: `<p>You are receiving this email because you have requested the reset of the password for your account.</p>
             <p>Please click on the following link, or paste this into your browser to complete the process:</p>
             <p><a href="${resetURL}">${resetURL}</a></p>
             <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};
