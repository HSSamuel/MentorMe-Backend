import { Role } from "@prisma/client";

interface RequestUser {
  userId: string;
  role: Role;
  email: string;
}

declare global {
  namespace Express {
    export interface Request {
      user?: RequestUser;
    }
  }
}
