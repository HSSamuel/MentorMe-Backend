import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getUserId } from "../utils/getUserId";

const prisma = new PrismaClient();

// GET goals for a specific mentorship
export const getGoalsForMentorship = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  const { mentorshipId } = req.params;

  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const mentorship = await prisma.mentorshipRequest.findFirst({
      where: {
        id: mentorshipId,
        OR: [{ menteeId: userId }, { mentorId: userId }],
      },
    });

    if (!mentorship) {
      res
        .status(404)
        .json({ message: "Mentorship not found or access denied." });
      return;
    }

    const goals = await prisma.goal.findMany({
      where: { mentorshipRequestId: mentorshipId },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json(goals);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching goals." });
  }
};

// POST a new goal
export const createGoal = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  const {
    mentorshipRequestId,
    title,
    description,
    category,
    dueDate,
    specific,
    measurable,
    achievable,
    relevant,
    timeBound,
  } = req.body;

  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const mentorship = await prisma.mentorshipRequest.findFirst({
      where: {
        id: mentorshipRequestId,
        menteeId: userId, // Only the mentee can create goals
      },
    });

    if (!mentorship) {
      res
        .status(404)
        .json({ message: "Mentorship not found or you are not the mentee." });
      return;
    }

    const newGoal = await prisma.goal.create({
      data: {
        title,
        description: description || "",
        category: category || "General",
        dueDate: dueDate ? new Date(dueDate) : null,
        specific, // Now correctly saved
        measurable, // Now correctly saved
        achievable, // Now correctly saved
        relevant, // Now correctly saved
        timeBound, // Now correctly saved
        status: "InProgress",
        mentorshipRequest: {
          connect: { id: mentorshipRequestId },
        },
      },
    });

    res.status(201).json(newGoal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error creating goal." });
  }
};

// The only function that needs to be checked is updateGoal
export const updateGoal = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  const { goalId } = req.params;
  const { title, description, isCompleted } = req.body;
  const io = req.app.locals.io; // Access io from the request object

  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        mentorshipRequest: {
          menteeId: userId,
        },
      },
      include: { mentorshipRequest: true },
    });

    if (!goal) {
      res
        .status(404)
        .json({ message: "Goal not found or you are not the mentee." });
      return;
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: { title, description, isCompleted },
    });

    if (isCompleted) {
      io.emit("goalCompleted", {
        goalId: updatedGoal.id,
        menteeId: userId,
        mentorId: goal.mentorshipRequest.mentorId,
      });
    }

    res.status(200).json(updatedGoal);
  } catch (error) {
    res.status(500).json({ message: "Server error updating goal." });
  }
};

// DELETE a goal
export const deleteGoal = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  const { goalId } = req.params;

  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        mentorshipRequest: {
          menteeId: userId,
        },
      },
    });

    if (!goal) {
      res
        .status(404)
        .json({ message: "Goal not found or you are not the mentee." });
      return;
    }

    await prisma.goal.delete({
      where: { id: goalId },
    });

    res.status(204).send(); // No content
  } catch (error) {
    res.status(500).json({ message: "Server error deleting goal." });
  }
};

// GET all goals for the logged-in mentee
export const getAllMyGoals = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);

  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const goals = await prisma.goal.findMany({
      where: {
        mentorshipRequest: {
          menteeId: userId,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(goals);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching goals." });
  }
};
