/*
  Warnings:

  - The primary key for the `UserTrackGroupPurchase` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `UserTrackGroupPurchase` table. All the data in the column will be lost.
  - Made the column `trackGroupId` on table `UserTrackGroupPurchase` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "UserTrackGroupPurchase" DROP CONSTRAINT "UserTrackGroupPurchase_trackGroupId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + '10 min'::interval;

-- AlterTable
ALTER TABLE "UserTrackGroupPurchase" DROP CONSTRAINT "UserTrackGroupPurchase_pkey",
DROP COLUMN "id",
ALTER COLUMN "trackGroupId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "UserTrackGroupPurchase" ADD CONSTRAINT "UserTrackGroupPurchase_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
