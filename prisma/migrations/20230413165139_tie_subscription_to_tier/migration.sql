-- DropForeignKey
ALTER TABLE "ArtistUserSubscription" DROP CONSTRAINT "ArtistUserSubscription_artistSubscriptionTierId_fkey";

-- AlterTable
ALTER TABLE "ArtistUserSubscription" ADD COLUMN     "artistId" INTEGER;

-- AddForeignKey
ALTER TABLE "ArtistUserSubscription" ADD CONSTRAINT "ArtistUserSubscription_artistSubscriptionTierId_fkey" FOREIGN KEY ("artistSubscriptionTierId") REFERENCES "ArtistSubscriptionTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistUserSubscription" ADD CONSTRAINT "ArtistUserSubscription_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
