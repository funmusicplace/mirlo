UPDATE "User" SET "trustLevel" = 0 WHERE "trustLevel" IS NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "trustLevel" SET NOT NULL;
