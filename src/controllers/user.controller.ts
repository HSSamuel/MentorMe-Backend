import { Request, Response, NextFunction } from "express";
import prisma from "../client";
import { getUserId } from "../utils/getUserId";
import { generateEmbedding } from "../services/ai.service";
import { cosineSimilarity } from "../utils/cosineSimilarity";

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
    "Full Stack Development",
    "Augmented Reality (AR)",
    "Virtual Reality (VR)",
    "Blockchain Development",
    "Product Management",
    "Business Analysis",
    "Technical Writing",
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
    "Emotional Intelligence",
    "Leadership & Mentoring",
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
    // --- FIX: Run queries concurrently without a single transaction ---
    const menteeCountPromise = prisma.mentorshipRequest.count({
      where: { mentorId: id, status: "ACCEPTED" },
    });
    const pendingRequestsPromise = prisma.mentorshipRequest.count({
      where: { mentorId: id, status: "PENDING" },
    });
    const upcomingSessionsPromise = prisma.session.count({
      where: { mentorId: id, date: { gte: new Date() } },
    });
    const completedSessionsPromise = prisma.session.count({
      where: { mentorId: id, date: { lt: new Date() } },
    });
    const reviewAggregationPromise = prisma.review.aggregate({
      where: {
        mentorshipRequest: {
          mentorId: id,
        },
      },
      _avg: {
        rating: true,
      },
    });

    const [
      menteeCount,
      pendingRequests,
      upcomingSessions,
      completedSessions,
      reviewAggregation,
    ] = await Promise.all([
      menteeCountPromise,
      pendingRequestsPromise,
      upcomingSessionsPromise,
      completedSessionsPromise,
      reviewAggregationPromise,
    ]);
    // --- END OF FIX ---

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
    // --- FIX: Run queries concurrently without a single transaction ---
    const mentorCountPromise = prisma.mentorshipRequest.count({
      where: { menteeId: userId, status: "ACCEPTED" },
    });
    const pendingRequestsPromise = prisma.mentorshipRequest.count({
      where: { menteeId: userId, status: "PENDING" },
    });
    const upcomingSessionsPromise = prisma.session.count({
      where: { menteeId: userId, date: { gte: new Date() } },
    });
    const completedSessionsPromise = prisma.session.count({
      where: { menteeId: userId, date: { lt: new Date() } },
    });

    const [mentorCount, pendingRequests, upcomingSessions, completedSessions] =
      await Promise.all([
        mentorCountPromise,
        pendingRequestsPromise,
        upcomingSessionsPromise,
        completedSessionsPromise,
      ]);
    // --- END OF FIX ---

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
    // 1. Get the current mentee's profile and vector
    const mentee = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    // Check if the mentee has a profile and a generated vector
    if (!mentee?.profile?.vector || mentee.profile.vector.length === 0) {
      res.status(200).json([]);
      return;
    }

    // 2. Get all mentors who have a profile
    const mentors = await prisma.user.findMany({
      where: {
        role: "MENTOR",
        id: { not: userId },
        profile: {
          isNot: null, // We only need to check that they have a profile
        },
      },
      include: { profile: true }, // This ensures profile data is included
    });

    // 3. Calculate the similarity score for each mentor
    const recommendations = mentors
      // --- THIS IS THE FIX ---
      // Filter out mentors who don't have a vector and calculate the score
      .map((mentor) => {
        if (!mentor.profile?.vector || mentor.profile.vector.length === 0) {
          return null; // This mentor will be filtered out
        }
        const score = cosineSimilarity(
          mentee.profile!.vector,
          mentor.profile.vector // Correctly access the vector
        );
        return { ...mentor, matchScore: score };
      })
      .filter(Boolean) // Remove any null entries
      // --------------------
      .sort((a, b) => b!.matchScore - a!.matchScore)
      .slice(0, 3);

    res.status(200).json(recommendations);
  } catch (error) {
    console.error("Error fetching recommended mentors:", error);
    res.status(500).json({ message: "Error fetching recommended mentors." });
  }
};

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
      const otherUser = ship.mentorId === userId ? ship.mentee : ship.mentor;
      return {
        mentorshipRequestId: ship.id,
        id: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
        name: otherUser.profile?.name || "User",
        avatarUrl: otherUser.profile?.avatarUrl,
      };
    });

    const uniqueConnections = Array.from(
      new Map(connections.map((item) => [item.id, item])).values()
    );

    res.status(200).json(uniqueConnections);
  } catch (error) {
    console.error("Error fetching user connections:", error);
    next(error);
  }
};
