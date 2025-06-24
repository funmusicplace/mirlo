import { Prisma } from "../__generated__";

export const clients: Prisma.ClientCreateInput[] = [
  {
    // id: 1,
    applicationName: "frontend",
    applicationUrl: "http://localhost:8080",
    allowedCorsOrigins: ["http://localhost:8080"],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    key: "7de84393-13d5-445b-93b1-171b99215c3a",
  },
];
