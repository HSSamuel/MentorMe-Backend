// Backend/test-key.js
require("dotenv").config();
const axios = require("axios");

const apiKey = process.env.GOOGLE_API_KEY; // <-- IMPORTANT: Change this variable name to match your .env file!
const testQuery = "Harry Potter";

console.log(
  `Testing with API Key: ${apiKey ? apiKey.substring(0, 10) + "..." : "Key not found!"}`
);

const testApiKey = async () => {
  if (!apiKey) {
    console.error("Error: API key not found in .env file.");
    return;
  }
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${testQuery}&key=${apiKey}`;
    const response = await axios.get(url);
    if (response.data.items) {
      console.log("✅ Success! The API key is working correctly.");
      console.log(`Found book: ${response.data.items[0].volumeInfo.title}`);
    } else {
      console.log(
        "Something went wrong, but the key might be okay.",
        response.data
      );
    }
  } catch (error) {
    console.error("❌ Error! The API key is invalid or has a problem.");
    if (error.response) {
      console.error("Details:", error.response.data);
    }
  }
};

testApiKey();
