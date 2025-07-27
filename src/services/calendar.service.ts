import { google } from "googleapis";
import prisma from "../client";

// Initialize the Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BACKEND_URL}/api/calendar/google/callback` // This must exactly match the URI in your Google Cloud Console
);

/**
 * Generates a URL that asks the user for permission to access their calendar.
 */
export const generateAuthUrl = (userId: string) => {
  const scopes = ["https://www.googleapis.com/auth/calendar.events"];

  return oauth2Client.generateAuthUrl({
    access_type: "offline", // 'offline' is necessary to get a refresh token
    scope: scopes,
    // A 'state' parameter is used to pass the userId through the OAuth flow
    state: userId,
  });
};

/**
 * Exchanges an authorization code for access and refresh tokens.
 */
export const getTokensFromCode = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

/**
 * Creates a new event in the user's Google Calendar.
 */
export const createCalendarEvent = async (
  userId: string,
  eventDetails: {
    summary: string;
    description: string;
    start: Date;
    end: Date;
    attendees: string[];
  }
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.googleAccessToken || !user.googleRefreshToken) {
    throw new Error("User is not authenticated with Google Calendar.");
  }

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.start.toISOString(),
        timeZone: "UTC", // Or dynamically set the user's timezone
      },
      end: {
        dateTime: eventDetails.end.toISOString(),
        timeZone: "UTC",
      },
      attendees: eventDetails.attendees.map((email) => ({ email })),
    },
  });
};
