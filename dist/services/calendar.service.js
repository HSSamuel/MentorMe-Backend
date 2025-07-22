"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCalendarEvent = exports.getTokensFromCode = exports.generateAuthUrl = void 0;
const googleapis_1 = require("googleapis");
const client_1 = __importDefault(require("../client"));
// Initialize the Google OAuth2 client
const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${process.env.BACKEND_URL}/api/calendar/google/callback` // This must exactly match the URI in your Google Cloud Console
);
/**
 * Generates a URL that asks the user for permission to access their calendar.
 */
const generateAuthUrl = (userId) => {
    const scopes = ["https://www.googleapis.com/auth/calendar.events"];
    return oauth2Client.generateAuthUrl({
        access_type: "offline", // 'offline' is necessary to get a refresh token
        scope: scopes,
        // A 'state' parameter is used to pass the userId through the OAuth flow
        state: userId,
    });
};
exports.generateAuthUrl = generateAuthUrl;
/**
 * Exchanges an authorization code for access and refresh tokens.
 */
const getTokensFromCode = async (code) => {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
};
exports.getTokensFromCode = getTokensFromCode;
/**
 * Creates a new event in the user's Google Calendar.
 */
const createCalendarEvent = async (userId, eventDetails) => {
    const user = await client_1.default.user.findUnique({ where: { id: userId } });
    if (!user || !user.googleAccessToken || !user.googleRefreshToken) {
        throw new Error("User is not authenticated with Google Calendar.");
    }
    oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken,
    });
    const calendar = googleapis_1.google.calendar({ version: "v3", auth: oauth2Client });
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
exports.createCalendarEvent = createCalendarEvent;
