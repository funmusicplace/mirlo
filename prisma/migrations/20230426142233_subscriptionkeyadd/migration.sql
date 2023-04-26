/*
  Warnings:

  - You are about to drop the column `stripeId` on the `ArtistUserSubscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArtistUserSubscription" DROP COLUMN "stripeId",
ADD COLUMN     "stripeSubscriptionKey" TEXT;

-- AlterTable
ALTER TABLE "TrackGroup" ADD COLUMN     "stripeProductKey" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
