/*
  Warnings:

  - The `includePurchaseTrackGroupId` column on the `Merch` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `trackGroupId` to the `Merch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Merch" ADD COLUMN     "currency" TEXT DEFAULT 'usd',
ADD COLUMN     "trackGroupId" INTEGER NOT NULL,
ALTER COLUMN "sku" DROP NOT NULL,
DROP COLUMN "includePurchaseTrackGroupId",
ADD COLUMN     "includePurchaseTrackGroupId" INTEGER;

-- AlterTable
ALTER TABLE "TrackGroup" ALTER COLUMN "currency" SET DEFAULT 'usd';

-- AddForeignKey
ALTER TABLE "Merch" ADD CONSTRAINT "Merch_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
