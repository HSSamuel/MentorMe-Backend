import { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

// Helper function to safely get userId from either JWT payload or Passport user object
const getUserId = (req: Request): string | null => {
  if (!req.user) return null;
  if ("userId" in req.user) return req.user.userId as string; // From JWT
  if ("id" in req.user) return req.user.id as string; // From Passport/Prisma
  return null;
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create both the user and their profile in a single transaction
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        profile: {
          create: {
            name: email.split("@")[0], // Use the part of the email before the @ as a default name
          },
        },
      },
      include: {
        profile: true, // Include the new profile in the response
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Registration Error:", error); // Log the actual error to the console
    res.status(500).json({ message: "Server error during registration" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Corrected logic: check for user and user.password existence
    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: "Server error during login" });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      // Corrected: Added googleAccessToken and googleRefreshToken to the select query
      select: {
        id: true,
        email: true,
        role: true,
        profile: true,
        googleAccessToken: true,
        googleRefreshToken: true,
      },
    });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
