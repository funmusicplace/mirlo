import type {
  Client as PrismaClient,
  User as PrismaUser,
} from "@mirlo/prisma/client";
import type { Logger } from "winston";

declare global {
  namespace Express {
    interface User extends PrismaUser {
      mfaAt?: number;
    }
    interface Request {
      client?: PrismaClient;
      oauth?: { clientId: string; scopes: string[] };
      logger?: Logger;
    }
  }
}

export {};
