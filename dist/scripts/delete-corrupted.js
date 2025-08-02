"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// In Mentor/Backend/delete-corrupted.ts
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const uri = process.env.MONGODB_URI;
const corruptedId = "6888362ca4fcf090abfc9152"; // The ID from the diagnostic script
if (!uri) {
    console.error("🔴 MONGODB_URI not found in .env file. Exiting.");
    process.exit(1);
}
const client = new mongodb_1.MongoClient(uri);
async function deleteCorruptedDocument() {
    console.log(`--- Attempting to delete document with ID: ${corruptedId} ---`);
    try {
        await client.connect();
        // IMPORTANT: Replace "mentor-me" if your database name is different
        const database = client.db("mentor-me");
        // IMPORTANT: Collection names are case-sensitive. Check yours in MongoDB Atlas.
        const sessionsCollection = database.collection("Session");
        const result = await sessionsCollection.deleteOne({
            _id: new mongodb_1.ObjectId(corruptedId),
        });
        if (result.deletedCount === 1) {
            console.log("✅ Successfully deleted the corrupted document.");
        }
        else {
            console.log("⚠️ Document not found. It may have already been deleted.");
        }
    }
    catch (err) {
        console.error("An error occurred during deletion:", err);
    }
    finally {
        await client.close();
        console.log("--- Deletion script finished. ---");
    }
}
deleteCorruptedDocument();
