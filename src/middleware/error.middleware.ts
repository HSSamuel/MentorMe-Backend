import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

export const jsonErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "An unexpected server error occurred.";

  // Log the full error to the console for debugging
  console.error("--- GLOBAL ERROR HANDLER CAUGHT AN ERROR ---");
  console.error(err);

  // Handle specific Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        // Unique constraint violation
        statusCode = 409; // Conflict
        message = `A record with this value already exists. Fields: ${err.meta?.target}`;
        break;
      case "P2025":
        // Record to update or delete not found
        statusCode = 404;
        message = "The requested record was not found.";
        break;
      // Add other Prisma error codes as needed
      default:
        message = "A database error occurred.";
        break;
    }
  }

  res.status(statusCode).json({
    message: message,
    // In development, send the error stack for easier debugging
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
