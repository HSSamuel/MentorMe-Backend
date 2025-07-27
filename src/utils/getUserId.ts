import { Request } from "express";

/**
 * Safely extracts the user ID from the request object, which might be populated
 * by either the JWT middleware or Passport's session management.
 * @param {Request} req The Express request object.
 * @returns {string | null} The user ID if found, otherwise null.
 */
export const getUserId = (req: Request): string | null => {
  if (!req.user) return null;

  // Check for JWT payload structure from our authMiddleware
  if ("userId" in req.user && req.user.userId) {
    return req.user.userId as string;
  }

  // Check for Passport user object structure (often has an 'id' property)
  if ("id" in req.user && (req.user as any).id) {
    return (req.user as any).id as string;
  }

  return null;
};
