-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';

-- CreateTable
CREATE TABLE "UserTrackGroupWishlist" (
    "userId" INTEGER NOT NULL,
    "trackGroupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTrackGroupWishlist_userId_trackGroupId_key" ON "UserTrackGroupWishlist"("userId", "trackGroupId");

-- AddForeignKey
ALTER TABLE "UserTrackGroupWishlist" ADD CONSTRAINT "UserTrackGroupWishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrackGroupWishlist" ADD CONSTRAINT "UserTrackGroupWishlist_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
