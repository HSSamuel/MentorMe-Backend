import { PrismaClient } from "@prisma/client";

// This declaration helps TypeScript understand that we are creating a global variable.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}
export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query", "info", "warn", "error"], // Optional: Provides more detailed logging for debugging.
  });

// In a non-production environment, we assign the prisma instance to the global object.
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
