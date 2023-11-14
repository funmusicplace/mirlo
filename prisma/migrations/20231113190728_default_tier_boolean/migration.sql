-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" ADD COLUMN     "isDefaultTier" BOOLEAN;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
