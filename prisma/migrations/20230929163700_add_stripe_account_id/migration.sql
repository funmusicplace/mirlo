-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stripeAccountId" TEXT,
ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
