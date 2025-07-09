"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const generative_ai_1 = require("@google/generative-ai");
function runTest() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("--- Starting AI Connection Test ---");
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("🔴 ERROR: GEMINI_API_KEY not found in .env file.");
            return;
        }
        console.log("✅ API Key found. Initializing AI client...");
        try {
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            console.log("✅ AI Client initialized. Sending a test message...");
            const prompt = "What is the capital of Nigeria?";
            const result = yield model.generateContent(prompt);
            const response = result.response;
            const text = response.text();
            console.log("✅ SUCCESS! AI responded:");
            console.log(text);
        }
        catch (error) {
            console.error("🔴 ERROR: The AI service failed. See the full error details below.");
            console.error(error);
        }
        finally {
            console.log("--- Test Complete ---");
        }
    });
}
runTest();
