-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';

-- CreateTable
CREATE TABLE "CronJobs" (
    "id" SERIAL NOT NULL,
    "jobName" TEXT NOT NULL,
    "lastRun" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CronJobs_pkey" PRIMARY KEY ("id")
);
