-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';

-- AlterTable
ALTER TABLE "UserTrackGroupPurchase" ADD COLUMN     "singleDownloadToken" TEXT;
