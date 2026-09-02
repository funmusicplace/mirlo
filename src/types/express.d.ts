import type {
  Client as PrismaClient,
  User as PrismaUser,
} from "@mirlo/prisma/client";
import type { Logger } from "winston";

declare global {
  namespace Express {
    interface User extends PrismaUser {}
    interface Request {
      client?: PrismaClient;
      logger?: Logger;
    }
  }
}

export {};
