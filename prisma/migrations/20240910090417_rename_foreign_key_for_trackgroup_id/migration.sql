/*
  Warnings:

  - You are about to drop the column `trackGroupId` on the `Merch` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Merch" DROP CONSTRAINT "Merch_trackGroupId_fkey";

-- AlterTable
ALTER TABLE "Merch" DROP COLUMN "trackGroupId";

-- AddForeignKey
ALTER TABLE "Merch" ADD CONSTRAINT "Merch_includePurchaseTrackGroupId_fkey" FOREIGN KEY ("includePurchaseTrackGroupId") REFERENCES "TrackGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
