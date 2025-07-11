// Mentor/Backend/src/config/index.ts
import path from "path";
import fs from "fs";

const env = process.env.NODE_ENV || "development";
let config = {};

const configFile = path.join(__dirname, `${env}.json`);

if (fs.existsSync(configFile)) {
  const fileContent = fs.readFileSync(configFile, "utf-8");
  config = JSON.parse(fileContent);
}

export default {
  get: (key: string): string | undefined => {
    return process.env[key] || (config as any)[key];
  },
};
