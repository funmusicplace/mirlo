/*
  Warnings:

  - You are about to drop the `UserTrackGroupFavorite` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserTrackGroupFavorite" DROP CONSTRAINT "UserTrackGroupFavorite_trackId_fkey";

-- DropForeignKey
ALTER TABLE "UserTrackGroupFavorite" DROP CONSTRAINT "UserTrackGroupFavorite_userId_fkey";

-- DropTable
DROP TABLE "UserTrackGroupFavorite";

-- CreateTable
CREATE TABLE "UserTrackFavorite" (
    "userId" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTrackFavorite_userId_trackId_key" ON "UserTrackFavorite"("userId", "trackId");

-- AddForeignKey
ALTER TABLE "UserTrackFavorite" ADD CONSTRAINT "UserTrackFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrackFavorite" ADD CONSTRAINT "UserTrackFavorite_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
