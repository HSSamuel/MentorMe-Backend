import { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import zxcvbn from "zxcvbn";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../services/email.service";
import config from "../config";

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

  // --- FIX: Check if a user with this email already exists ---
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res
        .status(409) // 409 Conflict is a more appropriate status code
        .json({ message: "A user with this email address already exists." });
      return;
    }

    const passwordStrength = zxcvbn(password);
    if (passwordStrength.score < 3) {
      res.status(400).json({
        message: "Password is too weak. Please choose a stronger password.",
        suggestions: passwordStrength.feedback.suggestions,
      });
      return;
    }

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

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(200).json({
        message:
          "If a user with that email exists, a password reset link has been sent.",
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // Token expires in 10 minutes

    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    const resetURL = `${config.get("FRONTEND_URL")}/reset-password/${resetToken}`;

    await sendPasswordResetEmail(user.email, resetURL);

    res.status(200).json({
      message:
        "If a user with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token, password } = req.body;
  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({ message: "Token is invalid or has expired" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    res.status(200).json({ message: "Password has been reset." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
