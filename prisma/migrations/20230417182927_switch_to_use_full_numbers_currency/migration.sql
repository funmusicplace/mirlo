/*
  Warnings:

  - The `defaultAmount` column on the `ArtistSubscriptionTier` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `maxAmount` column on the `ArtistSubscriptionTier` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `minAmount` column on the `ArtistSubscriptionTier` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `minPrice` column on the `TrackGroup` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `amount` on the `ArtistUserSubscription` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
DROP COLUMN "defaultAmount",
ADD COLUMN     "defaultAmount" INTEGER,
DROP COLUMN "maxAmount",
ADD COLUMN     "maxAmount" INTEGER,
DROP COLUMN "minAmount",
ADD COLUMN     "minAmount" INTEGER;

-- AlterTable
ALTER TABLE "ArtistUserSubscription" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
DROP COLUMN "amount",
ADD COLUMN     "amount" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TrackGroup" ADD COLUMN     "currency" TEXT DEFAULT 'USD',
DROP COLUMN "minPrice",
ADD COLUMN     "minPrice" INTEGER;
