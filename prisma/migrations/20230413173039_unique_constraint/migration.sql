/*
  Warnings:

  - A unique constraint covering the columns `[userId,artistSubscriptionTierId]` on the table `ArtistUserSubscription` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TrackGroup_artistId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ArtistUserSubscription_userId_artistSubscriptionTierId_key" ON "ArtistUserSubscription"("userId", "artistSubscriptionTierId");
