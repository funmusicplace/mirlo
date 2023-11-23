-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" ADD COLUMN     "platformPercent" INTEGER DEFAULT 5;

-- AlterTable
ALTER TABLE "TrackGroup" ADD COLUMN     "platformPercent" INTEGER DEFAULT 5;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
