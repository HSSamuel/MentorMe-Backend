import { Request, Response, NextFunction } from "express";

export const jsonErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || "An unexpected error occurred.",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
