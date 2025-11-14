// test-key-direct.js
require("dotenv").config();
const axios = require("axios");

// We will use the GEMINI_API_KEY from your .env file
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ Error: GEMINI_API_KEY is not found in .env file.");
  process.exit(1);
}

console.log(`[1/2] Testing key: ${apiKey.substring(0, 10)}...`);

// This is the URL from your error log, just to see the model info
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro?key=${apiKey}`;

console.log(`[2/2] Contacting API: ${url.split("?")[0]}...`);

axios
  .get(url)
  .then((response) => {
    console.log("---");
    console.log("✅✅✅ SUCCESS! ✅✅✅");
    console.log("This is unexpected. The API is working.");
    console.log("Model Name:", response.data.displayName);
    console.log("Please re-run 'npm start' RIGHT NOW.");
  })
  .catch((error) => {
    console.log("---");
    console.error("❌❌❌ TEST FAILED (This is what we expected) ❌❌❌");
    console.error(
      "This is the REAL error from Google, which confirms the fix:"
    );

    if (error.response && error.response.data && error.response.data.error) {
      // This will print the *real* permission error
      console.error(JSON.stringify(error.response.data.error, null, 2));
    } else {
      console.error(error.message);
    }

    console.log("\n---");
    console.log(
      "FIX: Go to Google Cloud and enable the 'Generative Language API'."
    );
  });
