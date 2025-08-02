import { google } from "googleapis";
import prisma from "../client";
import { User } from "@prisma/client";

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
  userId: string, // This is the mentor's ID, who is creating the event
  eventDetails: {
    summary: string; // This will be replaced by our new summary
    description: string;
    start: Date;
    end: Date;
    attendees: string[]; // Expecting an array of mentee and mentor emails
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

  // --- START OF IMPROVEMENTS ---

  // 1. Fetch attendee profiles to get their names
  const attendeesWithProfiles = await prisma.user.findMany({
    where: {
      email: { in: eventDetails.attendees },
    },
    include: {
      profile: true,
    },
  });

  // 2. Create a clean list of names, falling back to email if a name isn't set
  const attendeeNames = attendeesWithProfiles
    .map((u) => u.profile?.name || u.email)
    .join(" & ");

  // 3. Format the date for the subject line
  const eventDate = eventDetails.start.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // 4. Construct the new, professional summary (email subject)
  const newSummary = `MentorMe Session: ${attendeeNames} on ${eventDate}`;

  // 5. Create an improved description for the event body
  const newDescription = `
    You have a new mentorship session scheduled via MentorMe.
    
    ${eventDetails.description}
    
    Please be on time and prepared for your session.
    
    - The MentorMe Team
  `;

  // --- END OF IMPROVEMENTS ---

  await calendar.events.insert({
    calendarId: "primary",
    // --- UPDATE: Add conferenceData for Google Meet link ---
    conferenceDataVersion: 1,
    requestBody: {
      summary: newSummary, // Use the new, improved summary
      description: newDescription, // Use the new, improved description
      start: {
        dateTime: eventDetails.start.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: eventDetails.end.toISOString(),
        timeZone: "UTC",
      },
      attendees: eventDetails.attendees.map((email) => ({ email })),
      // --- UPDATE: Automatically create a Google Meet link for the event ---
      conferenceData: {
        createRequest: {
          requestId: `mentor-me-session-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    },
  });
};
