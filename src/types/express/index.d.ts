import { Role } from "@prisma/client";

// Define the shape of the user object that will be attached to requests
interface RequestUser {
  userId: string;
  role: Role;
  email: string;
}

// Extend the global Express namespace
declare global {
  namespace Express {
    // This makes the Multer file type available globally if you use it
    interface Multer {
      File: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      };
    }

    // Add the custom 'user' and 'file' properties to the Request interface
    export interface Request {
      user?: RequestUser;
      file?: Express.Multer.File;
    }
  }
}
