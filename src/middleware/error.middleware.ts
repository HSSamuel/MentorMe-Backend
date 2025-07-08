import { Request, Response, NextFunction } from "express";

export const jsonErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;

  // Log the full error to the console for debugging
  console.error("--- GLOBAL ERROR HANDLER CAUGHT AN ERROR ---");
  console.error(err);

  res.status(statusCode).json({
    message: err.message || "An unexpected server error occurred.",
    // In development, send the error stack for easier debugging
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
