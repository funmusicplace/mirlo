/*
  Warnings:

  - You are about to drop the `ArtistCover` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ArtistCover" DROP CONSTRAINT "ArtistCover_artistId_fkey";

-- DropTable
DROP TABLE "ArtistCover";

-- CreateTable
CREATE TABLE "ArtistAvatar" (
    "id" UUID NOT NULL,
    "url" TEXT[],
    "artistId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "originalFilename" TEXT,

    CONSTRAINT "ArtistAvatar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistAvatar_artistId_key" ON "ArtistAvatar"("artistId");

-- AddForeignKey
ALTER TABLE "ArtistAvatar" ADD CONSTRAINT "ArtistAvatar_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
