import { Request, Response } from "express";
import { RequestStatus } from "@prisma/client";
import { awardPoints } from "../services/gamification.service";
import prisma from "../client";
import { StreamChat } from "stream-chat";
import { getUserId } from "../utils/getUserId";
// --- ADDED: Import the new email function ---
import { sendNewRequestEmail } from "../services/email.service";

const streamClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY!,
  process.env.STREAM_API_SECRET!
);

const getUserIdForRequest = (req: Request): string | null => {
  if (!req.user) return null;
  if ("userId" in req.user) return req.user.userId as string;
  if ("id" in req.user) return req.user.id as string;
  return null;
};

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
      data: {
        menteeId,
        mentorId,
        status: "PENDING",
        message: "Request to connect", // This seems to be a default message
      },
      include: {
        mentee: {
          include: { profile: true },
        },
        // --- ADDED: Include mentor details to get their email and name ---
        mentor: {
          include: { profile: true },
        },
      },
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

    // --- ADDED: Send the email notification to the mentor ---
    if (newRequest.mentor && newRequest.mentee) {
      await sendNewRequestEmail(
        newRequest.mentor.email,
        newRequest.mentee.profile?.name || "A mentee",
        newRequest.mentor.profile?.name || "Mentor"
      );
    }

    res.status(201).json(newRequest);
  } catch (error) {
    console.error("Error creating mentorship request:", error);
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
      include: {
        mentor: { include: { profile: true } },
        mentee: { include: { profile: true } },
      },
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
      try {
        const channelId = `mentorship-${request.mentorId}-${request.menteeId}`;

        const channelData = {
          name: `Mentorship: ${request.mentor.profile?.name} & ${request.mentee.profile?.name}`,
          created_by_id: mentorId,
          members: [request.mentorId, request.menteeId],
        };

        const channel = streamClient.channel(
          "messaging",
          channelId,
          channelData
        );

        await channel.create();
        console.log(`Stream channel created: ${channelId}`);
      } catch (chatError) {
        console.error("Error creating Stream chat channel:", chatError);
      }

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

export const sendRequest = async (req: Request, res: Response) => {
  const menteeId = getUserId(req);
  const mentorId = req.params.mentorId;
  const { message } = req.body;

  if (!menteeId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!message) {
    return res
      .status(400)
      .json({ message: "A message is required to send a request." });
  }

  try {
    const existingRequest = await prisma.mentorshipRequest.findFirst({
      where: { menteeId, mentorId, status: "PENDING" },
    });

    if (existingRequest) {
      return res.status(409).json({
        message: "You already have a pending request with this mentor.",
      });
    }

    const newRequest = await prisma.mentorshipRequest.create({
      data: {
        menteeId,
        mentorId,
        status: "PENDING",
        message: message,
      },
    });

    const mentee = await prisma.user.findUnique({
      where: { id: menteeId },
      include: { profile: true },
    });

    await prisma.notification.create({
      data: {
        userId: mentorId,
        type: "NEW_MENTORSHIP_REQUEST",
        message: `${mentee?.profile?.name || "A new mentee"} has sent you a mentorship request.`,
        link: "/requests",
      },
    });

    // --- ADDED: Send the email notification to the mentor ---
    if (mentee) {
      const mentor = await prisma.user.findUnique({
        where: { id: mentorId },
        include: { profile: true },
      });
      if (mentor) {
        await sendNewRequestEmail(
          mentor.email,
          mentee.profile?.name || "A mentee",
          mentor.profile?.name || "Mentor"
        );
      }
    }

    res.status(201).json(newRequest);
  } catch (error) {
    console.error("Error sending mentorship request:", error);
    res.status(500).json({ message: "Failed to send mentorship request" });
  }
};
