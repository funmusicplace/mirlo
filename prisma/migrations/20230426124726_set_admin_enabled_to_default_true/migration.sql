-- AlterTable
ALTER TABLE "Artist" ALTER COLUMN "enabled" SET DEFAULT true;

-- AlterTable
ALTER TABLE "TrackGroup" ALTER COLUMN "adminEnabled" SET DEFAULT true;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
