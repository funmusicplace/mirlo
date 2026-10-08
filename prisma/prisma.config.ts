import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
    seed: "ts-node seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
