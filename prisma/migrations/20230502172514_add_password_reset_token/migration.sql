-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordResetConfirmationExpiration" TIMESTAMP(3),
ADD COLUMN     "passwordResetConfirmationToken" TEXT,
ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
