-- AlterTable
ALTER TABLE "TrackGroup" ADD COLUMN     "credits" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
