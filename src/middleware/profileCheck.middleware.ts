export const ensureProfileComplete = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user.name || !user.bio || !user.skills.length || !user.goals) {
    return res.status(403).json({ message: "Complete profile required." });
  }
  next();
};