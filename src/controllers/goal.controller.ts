import { Request, Response } from "express";
import { getUserId } from "../utils/getUserId";
import prisma from "../client";

// GET goals for a specific mentorship
export const getGoalsForMentorship = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  // FIX: Standardize parameter name to 'id'
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const mentorship = await prisma.mentorshipRequest.findFirst({
      where: {
        id: id, // Use standardized 'id'
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
      where: { mentorshipRequestId: id }, // Use standardized 'id'
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
        menteeId: userId,
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
        specific,
        measurable,
        achievable,
        relevant,
        timeBound,
        status: "InProgress",
        mentorshipRequest: {
          connect: { id: mentorshipRequestId },
        },
      },
    });

    res.status(201).json(newGoal);
  } catch (error) {
    console.error("Error creating goal:", error);
    res.status(500).json({ message: "Server error creating goal." });
  }
};

// UPDATE a goal
export const updateGoal = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  // FIX: Standardize parameter name to 'id'
  const { id } = req.params;
  // FIX: Correctly read 'status' from the body
  const { title, description, status } = req.body;
  const io = req.app.locals.io;

  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const goal = await prisma.goal.findFirst({
      where: {
        id: id, // Use standardized 'id'
        mentorshipRequest: {
          menteeId: userId,
        },
      },
      include: { mentorshipRequest: true },
    });

    if (!goal) {
      res.status(404).json({
        message: "Goal not found or you do not have permission to edit it.",
      });
      return;
    }

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (status !== undefined) dataToUpdate.status = status;

    const updatedGoal = await prisma.goal.update({
      where: { id: id },
      data: dataToUpdate,
    });

    // FIX: Check 'status' for completion
    if (status === "Completed") {
      io.emit("goalCompleted", {
        goalId: updatedGoal.id,
        menteeId: userId,
        mentorId: goal.mentorshipRequest.mentorId,
      });
    }

    res.status(200).json(updatedGoal);
  } catch (error) {
    console.error("Error updating goal:", error);
    res.status(500).json({ message: "Server error updating goal." });
  }
};

// DELETE a goal
export const deleteGoal = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = getUserId(req);
  // FIX: Standardize parameter name to 'id'
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ message: "Authentication error" });
    return;
  }

  try {
    const goal = await prisma.goal.findFirst({
      where: {
        id: id, // Use standardized 'id'
        mentorshipRequest: {
          menteeId: userId,
        },
      },
    });

    if (!goal) {
      res.status(404).json({
        message: "Goal not found or you do not have permission to delete it.",
      });
      return;
    }

    await prisma.goal.delete({
      where: { id: id },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting goal:", error);
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
