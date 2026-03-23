-- AlterTable
ALTER TABLE "_MerchOptionToMerchPurchase" ADD CONSTRAINT "_MerchOptionToMerchPurchase_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_MerchOptionToMerchPurchase_AB_unique";
