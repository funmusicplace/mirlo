-- CreateTable
CREATE TABLE "SubscriptionTierRelease" (
    "tierId" INTEGER NOT NULL,
    "trackGroupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionTierRelease_tierId_trackGroupId_key" ON "SubscriptionTierRelease"("tierId", "trackGroupId");

-- AddForeignKey
ALTER TABLE "SubscriptionTierRelease" ADD CONSTRAINT "SubscriptionTierRelease_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "ArtistSubscriptionTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionTierRelease" ADD CONSTRAINT "SubscriptionTierRelease_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
