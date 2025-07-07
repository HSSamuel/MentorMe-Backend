import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";

const prisma = new PrismaClient();

export const ensureProfileComplete = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (
      !user ||
      !user.name ||
      !user.bio ||
      !user.skills.length ||
      !user.goals
    ) {
      return res.status(403).json({ message: "Complete profile required." });
    }
    next();
  } catch (error) {
    console.error("Error checking profile completeness:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
