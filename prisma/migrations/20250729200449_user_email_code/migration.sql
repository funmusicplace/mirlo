-- AlterTable
ALTER TABLE "User" ADD COLUMN     "userConfirmationCode" TEXT,
ADD COLUMN     "userConfirmationCodeExpiration" TIMESTAMP(3);
