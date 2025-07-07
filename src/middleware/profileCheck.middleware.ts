import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// A helper to safely get the user ID from the request
const getUserId = (req: Request): string | null => {
  if (req.user && "userId" in req.user) {
    return (req.user as { userId: string }).userId;
  }
  return null;
};

export const ensureProfileComplete = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = getUserId(req);

  // 1. Ensure user is authenticated
  if (!userId) {
    return res.status(401).json({ message: "Authentication error" });
  }

  try {
    // 2. Fetch the user's profile from the database
    const userWithProfile = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    const profile = userWithProfile?.profile;

    // 3. Check if the profile and all required fields exist
    if (
      !profile ||
      !profile.name ||
      !profile.bio ||
      !profile.skills ||
      profile.skills.length === 0 ||
      !profile.goals
    ) {
      return res.status(403).json({
        message: "Your profile is incomplete. Please update it to proceed.",
        code: "PROFILE_INCOMPLETE",
      });
    }

    // 4. If all checks pass, proceed to the next middleware/route
    next();
  } catch (error) {
    console.error("Error in ensureProfileComplete middleware:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
