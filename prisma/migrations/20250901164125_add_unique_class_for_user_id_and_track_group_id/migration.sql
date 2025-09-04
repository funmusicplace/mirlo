/*
  Warnings:

  - A unique constraint covering the columns `[userId,trackGroupId]` on the table `TrackGroupPledge` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TrackGroupPledge_userId_trackGroupId_key" ON "TrackGroupPledge"("userId", "trackGroupId");
