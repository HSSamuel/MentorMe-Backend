import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

// No custom interface needed here anymore. We use the globally extended Request type.
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let token: string | undefined;
  const authHeader = req.headers.authorization;

  // First, check for the token in the Authorization header
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  // If not found, check for it in the query parameters
  else if (req.query && req.query.token) {
    token = req.query.token as string;
  }

  // If no token is found in either place, send an error
  if (!token) {
    res.status(401).json({ message: "Authentication token required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
      email: string;
    };
    req.user = decoded; // This now matches our global type definition
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !("role" in req.user) || req.user.role !== "ADMIN") {
    res
      .status(403)
      .json({ message: "Access denied. Admin privileges required." });
    return;
  }
  next();
};

export const mentorMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !("role" in req.user) || req.user.role !== "MENTOR") {
    res
      .status(403)
      .json({ message: "Access denied. Mentor privileges required." });
    return;
  }
  next();
};

export const menteeMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !("role" in req.user) || req.user.role !== "MENTEE") {
    res
      .status(403)
      .json({ message: "Access denied. Mentee privileges required." });
    return;
  }
  next();
};
