/*
  Warnings:

  - You are about to drop the column `isBuyable` on the `TrackGroup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TrackGroup" DROP COLUMN "isBuyable",
ADD COLUMN     "isGettable" BOOLEAN NOT NULL DEFAULT true;
