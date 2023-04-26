/*
  Warnings:

  - You are about to drop the column `stripeSubscriptionKey` on the `ArtistUserSubscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" ADD COLUMN     "stripeSubscriptionKey" TEXT;

-- AlterTable
ALTER TABLE "ArtistUserSubscription" DROP COLUMN "stripeSubscriptionKey",
ADD COLUMN     "stripeSessionKey" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
