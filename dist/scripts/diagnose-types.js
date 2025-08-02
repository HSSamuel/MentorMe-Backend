"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// In Mentor/Backend/diagnose-types.ts
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error("🔴 MONGODB_URI not found in .env file. Exiting.");
    process.exit(1);
}
console.log(`[DIAGNOSE] Connecting to: ${uri}`);
const client = new mongodb_1.MongoClient(uri);
async function checkSessionTypes() {
    try {
        await client.connect();
        console.log("✅ Successfully connected to MongoDB.");
        // IMPORTANT: Replace "mentor-me" if your database name is different
        const database = client.db("mentor-me");
        // IMPORTANT: Collection names are case-sensitive. Check yours in MongoDB Atlas.
        const sessionsCollection = database.collection("Session");
        const sessions = await sessionsCollection.find({}).toArray();
        console.log(`Found ${sessions.length} total sessions to analyze.`);
        let invalidCount = 0;
        const invalidSessions = [];
        for (const session of sessions) {
            const mentorId = session.mentorId;
            const menteeId = session.menteeId;
            let isInvalid = false;
            // Check mentorId type
            if (mentorId !== null &&
                typeof mentorId !== "string" &&
                !(mentorId instanceof mongodb_1.ObjectId)) {
                isInvalid = true;
                console.error(`🔴 Invalid Document Found (ID: ${session._id}): mentorId is of type [${typeof mentorId}], not a string or ObjectId.`);
            }
            // Check menteeId type
            if (menteeId !== null &&
                typeof menteeId !== "string" &&
                !(menteeId instanceof mongodb_1.ObjectId)) {
                isInvalid = true;
                console.error(`🔴 Invalid Document Found (ID: ${session._id}): menteeId is of type [${typeof menteeId}], not a string or ObjectId.`);
            }
            if (isInvalid) {
                invalidCount++;
                invalidSessions.push(session);
            }
        }
        if (invalidCount > 0) {
            console.log(`\n🚨 Analysis complete. Found ${invalidCount} document(s) with incorrect ID types.`);
            console.log("Here is the raw data for the invalid documents:");
            console.log(JSON.stringify(invalidSessions, null, 2));
            console.log("\nRECOMMENDATION: Please delete these documents from your database using MongoDB Compass or ask for a script to delete them by their _id.");
        }
        else {
            console.log("\n✅ Analysis complete. All mentorId and menteeId fields have the correct type.");
            console.log("If this script finds no errors, the problem is exceptionally unusual and may be related to the Prisma engine or database driver version itself.");
        }
    }
    catch (err) {
        console.error("An error occurred:", err);
    }
    finally {
        await client.close();
        console.log("Connection closed.");
    }
}
checkSessionTypes();
