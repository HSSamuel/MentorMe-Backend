import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function runTest() {
  console.log("--- Starting AI Connection Test ---");

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("🔴 ERROR: GEMINI_API_KEY not found in .env file.");
    return;
  }

  console.log("✅ API Key found. Initializing AI client...");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log("✅ AI Client initialized. Sending a test message...");

    const prompt = "What is the capital of Nigeria?";
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log("✅ SUCCESS! AI responded:");
    console.log(text);
  } catch (error) {
    console.error(
      "🔴 ERROR: The AI service failed. See the full error details below."
    );
    console.error(error);
  } finally {
    console.log("--- Test Complete ---");
  }
}

runTest();
