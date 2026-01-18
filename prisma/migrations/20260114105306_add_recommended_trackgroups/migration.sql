-- CreateTable
CREATE TABLE "RecommendedTrackGroup" (
    "id" SERIAL NOT NULL,
    "trackGroupId" INTEGER NOT NULL,
    "recommendedTrackGroupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendedTrackGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecommendedTrackGroup_trackGroupId_recommendedTrackGroupId_key" ON "RecommendedTrackGroup"("trackGroupId", "recommendedTrackGroupId");

-- AddForeignKey
ALTER TABLE "RecommendedTrackGroup" ADD CONSTRAINT "RecommendedTrackGroup_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendedTrackGroup" ADD CONSTRAINT "RecommendedTrackGroup_recommendedTrackGroupId_fkey" FOREIGN KEY ("recommendedTrackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
