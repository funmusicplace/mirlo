/*
  Warnings:

  - You are about to drop the column `discountPercent` on the `ArtistSubscriptionTier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" DROP COLUMN "discountPercent",
ADD COLUMN     "digitalDiscountPercent" INTEGER DEFAULT 0,
ADD COLUMN     "merchDiscountPercent" INTEGER DEFAULT 0;
