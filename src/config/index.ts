import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const env = process.env.NODE_ENV || "development";
let config = {};

const configFile = path.join(__dirname, `${env}.json`);

if (fs.existsSync(configFile)) {
  const fileContent = fs.readFileSync(configFile, "utf-8");
  config = JSON.parse(fileContent);
}

export default {
  get: (key: string): string | undefined => {
    const value = process.env[key] || (config as any)[key];

    // --- FIX: Enforce production URL for emails ---
    // If the system tries to get the FRONTEND_URL and it's missing or set to localhost,
    // we force it to return the live Netlify URL. This ensures email links work correctly.
    if (key === "FRONTEND_URL") {
      if (!value || value.includes("localhost")) {
        return "https://dsamentor.netlify.app";
      }
    }

    return value;
  },
};
