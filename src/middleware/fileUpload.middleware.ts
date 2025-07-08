import multer from "multer";
import { storage } from "../config/cloudinary"; // Import the new Cloudinary storage

// Use the Cloudinary storage engine
// The old local storage configuration is no longer needed
export const upload = multer({ storage });
