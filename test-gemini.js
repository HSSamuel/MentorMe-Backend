// test-gemini.js
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY; // This is confirmed from ai.service.ts

if (!apiKey) {
  console.error("❌ Error: GEMINI_API_KEY is not found in your .env file.");
  process.exit(1);
}

console.log(`Testing with GEMINI_API_KEY: ${apiKey.substring(0, 10)}...`);
const genAI = new GoogleGenerativeAI(apiKey);

async function runTest() {
  try {
    console.log("Attempting to connect to gemini-pro...");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Hello");

    if (result.response) {
      console.log(
        "✅ Success! Connected to gemini-pro and received a response."
      );
      console.log("Response:", result.response.text());
    } else {
      console.log("Connected, but no response text.", result);
    }
  } catch (error) {
    console.error(
      "❌ Error! The test failed. This is the exact error from Google:"
    );
    console.error(error.message);
  }
}

runTest();
