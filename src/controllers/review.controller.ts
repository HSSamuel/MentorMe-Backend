import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const getUserId = (req: Request): string | null => {
  if (!req.user || !("userId" in req.user)) return null;
  return req.user.userId as string;
};

// POST /reviews
export const createReview = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  const { mentorshipRequestId, rating, comment } = req.body;

  if (!userId) {
    // Corrected: Removed 'return'
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    // Verify that the user is the mentee of this specific mentorship request
    const mentorship = await prisma.mentorshipRequest.findFirst({
      where: {
        id: mentorshipRequestId,
        menteeId: userId,
        status: "ACCEPTED", // Can only review accepted mentorships
      },
    });

    if (!mentorship) {
      // Corrected: Removed 'return'
      res
        .status(403)
        .json({ message: "You are not authorized to review this mentorship." });
      return;
    }

    // Check if a review for this mentorship already exists
    const existingReview = await prisma.review.findFirst({
      where: { mentorshipRequestId },
    });

    if (existingReview) {
      // Corrected: Removed 'return'
      res
        .status(400)
        .json({ message: "A review for this mentorship already exists." });
      return;
    }

    const newReview = await prisma.review.create({
      data: {
        mentorshipRequestId,
        rating,
        comment,
      },
    });

    res.status(201).json(newReview);
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ message: "Server error while creating review." });
  }
};

// GET /reviews/mentor/:mentorId
export const getReviewsForMentor = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { mentorId } = req.params;

  try {
    const reviews = await prisma.review.findMany({
      where: {
        mentorshipRequest: {
          mentorId: mentorId,
        },
      },
      include: {
        mentorshipRequest: {
          select: {
            mentee: {
              select: {
                profile: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Server error while fetching reviews." });
  }
};
