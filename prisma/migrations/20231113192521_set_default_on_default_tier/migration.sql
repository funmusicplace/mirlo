-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" ALTER COLUMN "isDefaultTier" SET DEFAULT false;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
