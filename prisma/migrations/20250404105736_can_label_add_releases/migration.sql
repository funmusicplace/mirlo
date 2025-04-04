/*
  Warnings:

  - You are about to drop the column `canLabelManageReleases` on the `ArtistLabel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArtistLabel" DROP COLUMN "canLabelManageReleases",
ADD COLUMN     "canLabelAddReleases" BOOLEAN NOT NULL DEFAULT true;
