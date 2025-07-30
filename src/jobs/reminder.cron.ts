import cron from "node-cron";
import { sendReminderEmail } from "../services/email.service";
import prisma from "../client";

// This cron job runs every hour to check for sessions starting in the next 24 hours.
cron.schedule("0 * * * *", async () => {
  console.log("Running hourly check for session reminders...");
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  try {
    const upcomingSessions = await prisma.session.findMany({
      where: {
        date: {
          gte: now,
          lte: reminderWindow,
        },
        // Optional: Add a flag to sessions to prevent sending multiple reminders
        // reminderSent: false,
      },
      include: {
        mentor: true,
        mentee: true, // For 1-on-1 sessions
        participants: {
          // For group sessions
          include: {
            mentee: true,
          },
        },
      },
    });

    for (const session of upcomingSessions) {
      // --- UPDATE: Handle both 1-on-1 and group session reminders ---
      if (session.isGroupSession) {
        // Handle Group Session ("Mentoring Circle")
        if (session.mentor) {
          console.log(
            `Sending group session reminder to mentor ${session.mentor.email}`
          );
          await sendReminderEmail(session.mentor.email, session.date);
        }
        for (const participant of session.participants) {
          if (participant.mentee) {
            console.log(
              `Sending group session reminder to mentee ${participant.mentee.email}`
            );
            await sendReminderEmail(participant.mentee.email, session.date);
          }
        }
      } else {
        // Handle 1-on-1 Session
        if (session.mentor && session.mentee) {
          console.log(
            `Sending 1-on-1 session reminder to ${session.mentor.email} and ${session.mentee.email}`
          );
          await sendReminderEmail(session.mentor.email, session.date);
          await sendReminderEmail(session.mentee.email, session.date);
        }
      }
      // Optional: Mark session as reminder-sent to avoid duplicates
      // await prisma.session.update({ where: { id: session.id }, data: { reminderSent: true } });
    }
  } catch (error) {
    console.error("Error sending session reminders:", error);
  }
});
