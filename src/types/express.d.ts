import type {
  Client as PrismaClient,
  User as PrismaUser,
} from "@mirlo/prisma/client";

declare global {
  namespace Express {
    interface User extends PrismaUser {}
    interface Request {
      client?: PrismaClient;
    }
  }
}

export {};
