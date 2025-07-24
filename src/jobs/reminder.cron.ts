import { sendReminderEmail } from "../services/email.service";
import prisma from "../client";

export const checkUpcomingSessions = async () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60000);

  const sessions = await prisma.session.findMany({
    where: {
      date: {
        gte: now,
        lte: oneHourLater,
      },
    },
    include: { mentor: true, mentee: true },
  });

  for (const session of sessions) {
    await sendReminderEmail(session.mentor.email, session.date);
    await sendReminderEmail(session.mentee.email, session.date);
  }
};

setInterval(checkUpcomingSessions, 5 * 60 * 1000);
