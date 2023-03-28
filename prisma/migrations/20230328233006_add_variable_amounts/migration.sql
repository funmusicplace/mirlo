/*
  Warnings:

  - You are about to drop the column `amount` on the `ArtistSubscriptionTier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" DROP COLUMN "amount",
ADD COLUMN     "allowVariable" BOOLEAN,
ADD COLUMN     "defaultAmount" TEXT,
ADD COLUMN     "maxAmount" TEXT,
ADD COLUMN     "minAmount" TEXT;
