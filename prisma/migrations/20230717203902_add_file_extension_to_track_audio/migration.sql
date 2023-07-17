-- AlterTable
ALTER TABLE "TrackAudio" ADD COLUMN     "fileExtension" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
