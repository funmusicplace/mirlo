-- AlterTable
ALTER TABLE "MerchPurchase" ADD COLUMN     "transactionId" TEXT;

-- AddForeignKey
ALTER TABLE "MerchPurchase" ADD CONSTRAINT "MerchPurchase_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "UserTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
