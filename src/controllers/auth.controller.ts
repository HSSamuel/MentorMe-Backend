import { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

// Define the shape of the user object attached by the auth middleware
interface RequestUser {
  userId: string;
  role: Role;
  email: string;
}

// Helper function with an explicit type assertion to resolve the error
const getUserId = (req: Request): string | null => {
  // We explicitly tell TypeScript that req.user is of type RequestUser
  const user = req.user as RequestUser;
  return user?.userId || null;
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        profile: {
          create: {
            name: email.split("@")[0],
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });

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
