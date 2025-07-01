-- AlterTable
ALTER TABLE "ArtistUserSubscription" ADD COLUMN     "platformCut" INTEGER;

-- AlterTable
ALTER TABLE "MerchPurchase" ADD COLUMN     "platformCut" INTEGER;

-- AlterTable
ALTER TABLE "UserArtistTip" ADD COLUMN     "platformCut" INTEGER;

-- AlterTable
ALTER TABLE "UserTrackGroupPurchase" ADD COLUMN     "platformCut" INTEGER;

-- AlterTable
ALTER TABLE "UserTrackPurchase" ADD COLUMN     "platformCut" INTEGER;
