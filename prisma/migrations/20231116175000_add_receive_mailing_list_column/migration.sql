-- AlterTable
ALTER TABLE "User" ADD COLUMN     "receiveMailingList" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
