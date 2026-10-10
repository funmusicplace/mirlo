-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailBounceReason" TEXT,
ADD COLUMN     "emailBouncedAt" TIMESTAMP(3);
