-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" ALTER COLUMN "platformPercent" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "TrackGroup" ALTER COLUMN "platformPercent" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + '10 min'::interval;
