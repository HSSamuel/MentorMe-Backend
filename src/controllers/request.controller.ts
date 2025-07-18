import { Request, Response } from "express";
import { PrismaClient, RequestStatus } from "@prisma/client";
import { awardPoints } from "../services/gamification.service";

const prisma = new PrismaClient();

const getUserIdForRequest = (req: Request): string | null => {
  if (!req.user) return null;
  if ("userId" in req.user) return req.user.userId as string;
  if ("id" in req.user) return req.user.id as string;
  return null;
};

// [... existing functions like createRequest, getSentRequests, etc. remain here ...]

// FIX: Add a new function to check the status of a request with a specific mentor
export const getRequestStatusWithMentor = async (
  req: Request,
  res: Response
): Promise<void> => {
  const menteeId = getUserIdForRequest(req);
  const { mentorId } = req.params;

  if (!menteeId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const request = await prisma.mentorshipRequest.findFirst({
      where: {
        menteeId,
        mentorId,
      },
      select: {
        status: true,
      },
    });

    if (request) {
      res.status(200).json({ status: request.status });
    } else {
      // If no request is found, it's not an error. It just means a request hasn't been sent.
      res.status(200).json({ status: null });
    }
  } catch (error) {
    console.error("Error fetching request status:", error);
    res.status(500).json({ message: "Server error checking request status" });
  }
};

export const createRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { mentorId } = req.body;
  const menteeId = getUserIdForRequest(req);
  if (!menteeId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  if (!mentorId) {
    res.status(400).json({ message: "Mentor ID is required" });
    return;
  }
  try {
    const existingRequest = await prisma.mentorshipRequest.findFirst({
      where: {
        menteeId,
        mentorId,
      },
    });

    if (existingRequest) {
      res
        .status(409)
        .json({ message: "You have already sent a request to this mentor." });
      return;
    }

    const newRequest = await prisma.mentorshipRequest.create({
      data: { menteeId, mentorId, status: "PENDING" },
      include: { mentee: { include: { profile: true } } },
    });

    await prisma.notification.create({
      data: {
        userId: mentorId,
        type: "NEW_MENTORSHIP_REQUEST",
        message: `You have a new mentorship request from ${
          newRequest.mentee.profile?.name || "a new mentee"
        }.`,
        link: `/requests`,
      },
    });

    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ message: "Server error while creating request" });
  }
};

export const getSentRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  const menteeId = getUserIdForRequest(req);
  if (!menteeId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  try {
    const requests = await prisma.mentorshipRequest.findMany({
      where: { menteeId },
      include: {
        mentor: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching sent requests" });
  }
};

export const getReceivedRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  const mentorId = getUserIdForRequest(req);
  if (!mentorId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  try {
    const requests = await prisma.mentorshipRequest.findMany({
      where: { mentorId },
      include: {
        mentee: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(requests);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error fetching received requests" });
  }
};

export const updateRequestStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  const mentorId = getUserIdForRequest(req);
  if (!mentorId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }
  if (!["ACCEPTED", "REJECTED"].includes(status)) {
    res.status(400).json({ message: "Invalid status" });
    return;
  }
  try {
    const request = await prisma.mentorshipRequest.findUnique({
      where: { id },
      include: { mentor: { include: { profile: true } } },
    });
    if (!request || request.mentorId !== mentorId) {
      res.status(404).json({ message: "Request not found or access denied" });
      return;
    }
    const updatedRequest = await prisma.mentorshipRequest.update({
      where: { id },
      data: { status: status as RequestStatus },
    });

    if (status === "ACCEPTED") {
      await prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: request.mentorId }, { id: request.menteeId }],
          },
        },
      });

      await awardPoints(request.mentorId, 25);
      await awardPoints(request.menteeId, 10);

      await prisma.notification.create({
        data: {
          userId: request.menteeId,
          type: "MENTORSHIP_REQUEST_ACCEPTED",
          message: `Your request with ${
            request.mentor.profile?.name
          } has been accepted!`,
          link: "/my-mentors",
        },
      });
    } else if (status === "REJECTED") {
      await prisma.notification.create({
        data: {
          userId: request.menteeId,
          type: "MENTORSHIP_REQUEST_REJECTED",
          message: `Your request with ${
            request.mentor.profile?.name
          } was declined.`,
          link: "/my-requests",
        },
      });
    }

    res.status(200).json(updatedRequest);
  } catch (error) {
    console.error("Error updating request status:", error);
    res.status(500).json({ message: "Server error while updating request" });
  }
};
