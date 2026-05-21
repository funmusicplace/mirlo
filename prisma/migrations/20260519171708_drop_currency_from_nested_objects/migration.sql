/*
  Warnings:

  - You are about to drop the column `currency` on the `ArtistSubscriptionTier` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `ArtistTipTier` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `ArtistUserSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Merch` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `MerchShippingDestination` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Track` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `TrackGroup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" DROP COLUMN "currency";

-- AlterTable
ALTER TABLE "ArtistTipTier" DROP COLUMN "currency";

-- AlterTable
ALTER TABLE "ArtistUserSubscription" DROP COLUMN "currency";

-- AlterTable
ALTER TABLE "Merch" DROP COLUMN "currency";

-- AlterTable
ALTER TABLE "MerchShippingDestination" DROP COLUMN "currency";

-- AlterTable
ALTER TABLE "Track" DROP COLUMN "currency";

-- AlterTable
ALTER TABLE "TrackGroup" DROP COLUMN "currency";
