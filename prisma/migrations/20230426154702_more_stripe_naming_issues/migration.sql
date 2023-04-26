/*
  Warnings:

  - You are about to drop the column `stripeSubscriptionKey` on the `ArtistSubscriptionTier` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionKey` on the `ArtistUserSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `stripeId` on the `UserTrackGroupPurchase` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" DROP COLUMN "stripeSubscriptionKey",
ADD COLUMN     "stripeProductKey" TEXT;

-- AlterTable
ALTER TABLE "ArtistUserSubscription" DROP COLUMN "stripeSessionKey",
ADD COLUMN     "stripeSubscriptionKey" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';

-- AlterTable
ALTER TABLE "UserTrackGroupPurchase" DROP COLUMN "stripeId",
ADD COLUMN     "stripeSessionKey" TEXT;
