/*
  Warnings:

  - You are about to drop the `CronJobs` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "hasAnnounceEmailBeenSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';

-- DropTable
DROP TABLE "CronJobs";
