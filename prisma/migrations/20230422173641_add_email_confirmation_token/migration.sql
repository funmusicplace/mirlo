-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailConfirmationExpiration" TIMESTAMP(3) DEFAULT NOW() + interval '10 min',
ADD COLUMN     "emailConfirmationToken" UUID;
