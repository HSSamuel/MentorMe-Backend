"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file in development
if (process.env.NODE_ENV !== "production") {
    dotenv_1.default.config();
}
const env = process.env.NODE_ENV || "development";
let config = {};
const configFile = path_1.default.join(__dirname, `${env}.json`);
if (fs_1.default.existsSync(configFile)) {
    const fileContent = fs_1.default.readFileSync(configFile, "utf-8");
    config = JSON.parse(fileContent);
}
exports.default = {
    get: (key) => {
        return process.env[key] || config[key];
    },
};
