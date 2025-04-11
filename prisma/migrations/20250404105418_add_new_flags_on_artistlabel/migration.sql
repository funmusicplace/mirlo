-- AlterTable
ALTER TABLE "ArtistLabel" ADD COLUMN     "canLabelManageArtist" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canLabelManageReleases" BOOLEAN NOT NULL DEFAULT false;
