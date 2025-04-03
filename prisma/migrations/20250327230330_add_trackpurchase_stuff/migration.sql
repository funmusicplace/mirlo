-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'USER_BOUGHT_YOUR_TRACK';

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "stripeProductKey" TEXT;

-- CreateTable
CREATE TABLE "UserTrackPurchase" (
    "userId" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    "pricePaid" INTEGER NOT NULL,
    "currencyPaid" TEXT NOT NULL DEFAULT 'usd',
    "datePurchased" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripeSessionKey" TEXT,
    "singleDownloadToken" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTrackPurchase_userId_trackId_key" ON "UserTrackPurchase"("userId", "trackId");

-- AddForeignKey
ALTER TABLE "UserTrackPurchase" ADD CONSTRAINT "UserTrackPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrackPurchase" ADD CONSTRAINT "UserTrackPurchase_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
