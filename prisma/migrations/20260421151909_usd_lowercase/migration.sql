-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" ALTER COLUMN "currency" SET DEFAULT 'usd';

-- AlterTable
ALTER TABLE "ArtistTipTier" ALTER COLUMN "currency" SET DEFAULT 'usd';

-- AlterTable
ALTER TABLE "ArtistUserSubscription" ALTER COLUMN "currency" SET DEFAULT 'usd';
