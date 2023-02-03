/*
  Warnings:

  - You are about to drop the `Audio` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Image` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Audio" DROP CONSTRAINT "Audio_trackId_fkey";

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_trackGroupId_fkey";

-- DropTable
DROP TABLE "Audio";

-- DropTable
DROP TABLE "Image";

-- CreateTable
CREATE TABLE "TrackGroupCover" (
    "id" UUID NOT NULL,
    "url" TEXT,
    "trackGroupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "originalFilename" TEXT,

    CONSTRAINT "TrackGroupCover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackAudio" (
    "id" UUID NOT NULL,
    "url" TEXT,
    "trackId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "originalFilename" TEXT,
    "duration" INTEGER,
    "hash" TEXT,
    "size" INTEGER,

    CONSTRAINT "TrackAudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackGroupCover_trackGroupId_key" ON "TrackGroupCover"("trackGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackAudio_trackId_key" ON "TrackAudio"("trackId");

-- AddForeignKey
ALTER TABLE "TrackGroupCover" ADD CONSTRAINT "TrackGroupCover_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackAudio" ADD CONSTRAINT "TrackAudio_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
