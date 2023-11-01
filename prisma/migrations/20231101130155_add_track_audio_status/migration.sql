-- CreateEnum
CREATE TYPE "UploadState" AS ENUM ('SUCCESS', 'ERROR', 'STARTED');

-- AlterTable
ALTER TABLE "TrackAudio" ADD COLUMN     "uploadState" "UploadState" DEFAULT 'STARTED';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
