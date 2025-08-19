-- AlterTable
ALTER TABLE "TrackGroup" ADD COLUMN     "defaultAllowMirloPromo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultTrackAllowIndividualSale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultTrackMinPrice" INTEGER;
