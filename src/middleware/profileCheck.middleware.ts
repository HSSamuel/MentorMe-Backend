import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const ensureProfileComplete = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // First, ensure the user object and its ID exist on the request.
  if (!req.user || !(req.user as any).userId) {
    return res
      .status(401)
      .json({ message: "Authentication error. User not found." });
  }

  try {
    const userId = (req.user as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User profile not found." });
    }

    const profile = user.profile;

    // Check if the profile and its essential fields are present.
    if (
      !profile ||
      !profile.name ||
      !profile.bio ||
      !profile.skills?.length ||
      !profile.goals
    ) {
      return res
        .status(403)
        .json({
          message: "Your profile is incomplete. Please update it to continue.",
        });
    }

    next();
  } catch (error) {
    console.error("Profile check error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while checking your profile." });
  }
};
