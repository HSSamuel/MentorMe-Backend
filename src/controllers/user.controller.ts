import { Request, Response, NextFunction } from "express";
import prisma from "../client";
import { getUserId } from "../utils/getUserId";
import { generateEmbedding } from "../services/ai.service";

export const getMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        lastSeen: true,
        profile: true,
      },
    });

    if (!userProfile) {
      res.status(404).json({ message: "User profile not found." });
      return;
    }
    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error fetching my profile:", error);
    next(error);
  }
};

export const getUserPublicProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    console.log(`Attempting to fetch public profile for user with ID: ${id}`);
    const userPublicProfile = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        lastSeen: true,
        profile: {
          select: {
            name: true,
            bio: true,
            skills: true,
            goals: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!userPublicProfile) {
      console.log(`User with ID ${id} not found.`);
      res.status(404).json({ message: "User profile not found." });
      return;
    }
    console.log(
      `Successfully fetched public profile for: ${
        userPublicProfile.profile
          ? userPublicProfile.profile.name
          : "Unknown Name"
      }`
    );
    res.status(200).json(userPublicProfile);
  } catch (error) {
    console.error("Error in getUserPublicProfile:", error);
    next(error);
  }
};

export const getAllMentors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const mentors = await prisma.user.findMany({
      where: { role: "MENTOR" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        email: true,
        lastSeen: true,
        profile: true,
      },
    });

    const totalMentors = await prisma.user.count({ where: { role: "MENTOR" } });

    res.status(200).json({
      mentors,
      totalPages: Math.ceil(totalMentors / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching mentors." });
  }
};

export const getAvailableSkills = async (
  req: Request,
  res: Response
): Promise<void> => {
  const skills = [
    "Virtual Assistant",
    "UI/UX Designer",
    "Software Development",
    "Video Editing",
    "Cybersecurity",
    "DevOps & Automation",
    "AI/ML",
    "Data Science",
    "Digital Marketing",
    "Graphic Design",
    "Project Management",
    "Content Creation",
    "Internet of Things (IoT)",
    "Cloud Computing",
    "Quantum Computing",
    "Mobile App Development",
    "Game Development",
    "Web Development",
    "Full Stack Development",
    "Augmented Reality (AR)",
    "Virtual Reality (VR)",
    "Blockchain Development",
    "Product Management",
    "Business Analysis",
    "Technical Writing",
    "SEO & SEM",
    "Social Media Management",
    "Copywriting",
    "Data Analysis",
    "UI Engineering",
    "IT Support & Helpdesk",
    "Financial Technology (FinTech)",
    "Computer Vision",
    "Natural Language Processing (NLP)",
    "Penetration Testing",
    "3D Animation & Modelling",
    "Robotic Process Automation (RPA)",
    "Low-Code/No-Code Development",
    "Cloud Security",
    "CRM Management (e.g., Salesforce, HubSpot)",
  ];
  res.status(200).json(skills);
};

export const getMentorStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const [
      menteeCount,
      pendingRequests,
      upcomingSessions,
      completedSessions,
      reviewAggregation,
    ] = await prisma.$transaction([
      prisma.mentorshipRequest.count({
        where: { mentorId: id, status: "ACCEPTED" },
      }),
      prisma.mentorshipRequest.count({
        where: { mentorId: id, status: "PENDING" },
      }),
      prisma.session.count({
        where: { mentorId: id, date: { gte: new Date() } },
      }),
      prisma.session.count({
        where: { mentorId: id, date: { lt: new Date() } },
      }),
      prisma.review.aggregate({
        where: {
          mentorshipRequest: {
            mentorId: id,
          },
        },
        _avg: {
          rating: true,
        },
      }),
    ]);

    const averageRating = reviewAggregation._avg.rating || 0;

    res.status(200).json({
      menteeCount,
      pendingRequests,
      upcomingSessions,
      completedSessions,
      averageRating,
    });
  } catch (error) {
    console.error(`Error fetching mentor stats for mentor ID ${id}:`, error);
    res.status(500).json({ message: "Error fetching mentor stats." });
  }
};

export const getMenteeStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  try {
    const [mentorCount, pendingRequests, upcomingSessions, completedSessions] =
      await prisma.$transaction([
        prisma.mentorshipRequest.count({
          where: { menteeId: userId, status: "ACCEPTED" },
        }),
        prisma.mentorshipRequest.count({
          where: { menteeId: userId, status: "PENDING" },
        }),
        prisma.session.count({
          where: { menteeId: userId, date: { gte: new Date() } },
        }),
        prisma.session.count({
          where: { menteeId: userId, date: { lt: new Date() } },
        }),
      ]);

    res.status(200).json({
      mentorCount,
      pendingRequests,
      upcomingSessions,
      completedSessions,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching mentee stats." });
  }
};

export const updateMyProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  const { name, bio, skills, goals } = req.body;
  let avatarUrl: string | undefined = undefined;

  if (req.file) {
    avatarUrl = req.file.path;
  }

  try {
    // Your existing profile update logic is preserved
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        name,
        bio,
        skills: skills || [],
        goals,
        ...(avatarUrl && { avatarUrl }),
      },
      create: {
        userId,
        name,
        bio,
        skills: skills || [],
        goals,
        ...(avatarUrl && { avatarUrl }),
      },
    });

    // --- 2. START OF NEW AI EMBEDDING LOGIC ---
    // Combine the most important profile fields into a single string
    const profileText = `
      Skills: ${(skills || []).join(", ")}.
      Interests and Goals: ${goals}.
      Bio: ${bio}.
    `;

    // Generate the embedding from the text
    const embedding = await generateEmbedding(profileText);

    // Save the generated embedding to the User model
    await prisma.user.update({
      where: { id: userId },
      data: {
        profileEmbedding: embedding,
      },
    });
    // --- END OF NEW AI EMBEDDING LOGIC ---

    if (avatarUrl) {
      const io = req.app.locals.io;
      io.emit("avatarUpdated", { userId, avatarUrl });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
};

export const getRecommendedMentors = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const menteeProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { skills: true, goals: true },
    });

    if (!menteeProfile || menteeProfile.skills.length === 0) {
      res.status(200).json([]);
      return;
    }

    const recommendedMentors = await prisma.user.findMany({
      where: {
        role: "MENTOR",
        id: { not: userId },
        profile: {
          skills: {
            hasSome: menteeProfile.skills,
          },
        },
      },
      take: 3,
      select: {
        id: true,
        profile: true,
      },
    });

    res.status(200).json(recommendedMentors);
  } catch (error) {
    res.status(500).json({ message: "Error fetching recommended mentors." });
  }
};

// --- [NEW] FUNCTION TO GET USER CONNECTIONS ---
export const getUserConnections = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const mentorships = await prisma.mentorshipRequest.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ mentorId: userId }, { menteeId: userId }],
      },
      include: {
        mentor: {
          include: {
            profile: true,
          },
        },
        mentee: {
          include: {
            profile: true,
          },
        },
      },
    });

    const connections = mentorships.map((ship) => {
      // If the current user is the mentor, the connection is the mentee, and vice versa.
      const otherUser = ship.mentorId === userId ? ship.mentee : ship.mentor;
      return {
        id: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
        name: otherUser.profile?.name || "User", // Provide a fallback name
        avatarUrl: otherUser.profile?.avatarUrl, // Match the schema field
      };
    });

    // Ensure connections are unique by user ID
    const uniqueConnections = Array.from(
      new Map(connections.map((item) => [item.id, item])).values()
    );

    res.status(200).json(uniqueConnections);
  } catch (error) {
    console.error("Error fetching user connections:", error);
    next(error); // Pass error to the global error handler
  }
};
// --- END OF NEW FUNCTION ---
