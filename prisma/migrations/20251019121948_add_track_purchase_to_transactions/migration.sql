-- AlterTable
ALTER TABLE "UserTrackPurchase" ADD COLUMN     "transactionId" TEXT;

-- AddForeignKey
ALTER TABLE "UserTrackPurchase" ADD CONSTRAINT "UserTrackPurchase_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "UserTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
