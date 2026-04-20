import type { User as PrismaUser } from "@mirlo/prisma/client";

declare global {
  namespace Express {
    interface User extends PrismaUser {}
  }
}

export {};
