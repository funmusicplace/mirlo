import { Prisma } from "@prisma/client";

export const clients: Prisma.ClientCreateInput[] = [
  {
    // id: 1,
    applicationName: "frontend",
    applicationUrl: "http://localhost:8080",
    allowedCorsOrigins: ["http://localhost:8080"],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];
