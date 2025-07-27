"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryUpload = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("../config/cloudinary"); // Import the new Cloudinary storage
// This uploader saves to Cloudinary and can be used for things like profile pictures
exports.upload = (0, multer_1.default)({ storage: cloudinary_1.storage });
// NEW: This uploader holds the file in memory for temporary processing
const memoryStorage = multer_1.default.memoryStorage();
exports.memoryUpload = (0, multer_1.default)({ storage: memoryStorage });
