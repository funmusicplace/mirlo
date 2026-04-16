-- AlterTable
ALTER TABLE "ArtistBackground" RENAME CONSTRAINT "ArtistBanner_pkey" TO "ArtistBackground_pkey";

-- RenameForeignKey
ALTER TABLE "ArtistBackground" RENAME CONSTRAINT "ArtistBanner_artistId_fkey" TO "ArtistBackground_artistId_fkey";

-- RenameIndex
ALTER INDEX "ArtistBanner_artistId_key" RENAME TO "ArtistBackground_artistId_key";
