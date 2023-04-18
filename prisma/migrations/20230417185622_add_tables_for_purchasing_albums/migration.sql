/*
  Warnings:

  - You are about to drop the column `enabled` on the `TrackGroup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TrackGroup" DROP COLUMN "enabled",
ADD COLUMN     "adminEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserTrackGroupPurchase" (
    "userId" INTEGER NOT NULL,
    "trackGroupId" INTEGER NOT NULL,
    "pricePaid" INTEGER NOT NULL,
    "currencyPaid" TEXT NOT NULL DEFAULT 'USD',
    "datePurchased" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTrackGroupPurchase_userId_trackGroupId_key" ON "UserTrackGroupPurchase"("userId", "trackGroupId");

-- AddForeignKey
ALTER TABLE "UserTrackGroupPurchase" ADD CONSTRAINT "UserTrackGroupPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrackGroupPurchase" ADD CONSTRAINT "UserTrackGroupPurchase_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
