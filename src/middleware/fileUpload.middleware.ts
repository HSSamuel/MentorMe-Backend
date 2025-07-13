import multer from "multer";
import { storage } from "../config/cloudinary"; // Import the new Cloudinary storage

// This uploader saves to Cloudinary and can be used for things like profile pictures
export const upload = multer({ storage });

// NEW: This uploader holds the file in memory for temporary processing
const memoryStorage = multer.memoryStorage();
export const memoryUpload = multer({ storage: memoryStorage });
