import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import zxcvbn from "zxcvbn";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../services/email.service";
import config from "../config";
import prisma from "../client";
import axios from "axios";
import { streamClient } from "./stream.controller";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

const getUserId = (req: Request): string | null => {
  if (!req.user) return null;
  if ("userId" in req.user) return req.user.userId as string;
  if ("id" in req.user) return req.user.id as string;
  return null;
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, role } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res
        .status(409)
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

    try {
      // --- This logic correctly uses the imported streamClient ---
      await streamClient.upsertUser({
        id: user.id,
        name: user.profile?.name || user.email.split("@")[0],
        role: user.role.toLowerCase(),
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.profile?.name || user.email
        )}&background=random&color=fff`,
      });
      console.log(`User ${user.id} created successfully in Stream Chat.`);
    } catch (chatError) {
      console.error("Error creating user in Stream Chat:", chatError);
    }

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
    // --- [MODIFIED] Include the user's profile in the query ---
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    // --- [ADDED] Sync user to Stream Chat on every login ---
    // This ensures all existing users are created in Stream.
    try {
      await streamClient.upsertUser({
        id: user.id,
        name: user.profile?.name || user.email.split("@")[0],
        role: user.role.toLowerCase(),
        image:
          user.profile?.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            user.profile?.name || user.email
          )}&background=random&color=fff`,
      });
      console.log(`User ${user.id} synced to Stream Chat on login.`);
    } catch (chatError) {
      console.error(
        "Error syncing user to Stream Chat during login:",
        chatError
      );
    }
    // --- End of Stream Chat user sync ---

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
        points: true,
        level: true,
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

    const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    const resetURL = `${config.get(
      "FRONTEND_URL"
    )}/reset-password/${resetToken}`;

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

export const handleGitHubCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { code } = req.query;

  if (!code) {
    res.status(400).send("Error: No authorization code provided.");
    return;
  }

  try {
    // 1. Exchange code for an access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      null,
      {
        params: {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        headers: {
          Accept: "application/json",
        },
      }
    );
    const accessToken = tokenResponse.data.access_token;

    // 2. Fetch user's profile from GitHub
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const githubUser = userResponse.data;

    // --- [THIS IS THE FIX] ---
    // If the primary email is private, we need to make a second API call
    let userEmail = githubUser.email;
    if (!userEmail) {
      const emailsResponse = await axios.get(
        "https://api.github.com/user/emails",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const primaryEmail = emailsResponse.data.find(
        (email: any) => email.primary
      );
      if (primaryEmail) {
        userEmail = primaryEmail.email;
      }
    }

    if (!userEmail) {
      res
        .status(400)
        .send("Error: Could not retrieve a primary email address from GitHub.");
      return;
    }
    // --- END OF FIX ---

    // 3. Find or create a user in your database
    let user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          githubId: githubUser.id.toString(),
          profile: {
            create: {
              name: githubUser.name || githubUser.login,
              bio: githubUser.bio || "Profile created via GitHub.",
              avatarUrl: githubUser.avatar_url,
              skills: [],
              goals: "To connect with a mentor and grow my career.",
            },
          },
        },
      });
    }

    // 4. Generate a JWT and redirect to the frontend
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error("GitHub authentication failed:", error);
    res.status(500).send("An error occurred during GitHub authentication.");
  }
};