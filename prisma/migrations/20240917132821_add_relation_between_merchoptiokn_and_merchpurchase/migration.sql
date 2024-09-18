-- CreateTable
CREATE TABLE "_MerchOptionToMerchPurchase" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_MerchOptionToMerchPurchase_AB_unique" ON "_MerchOptionToMerchPurchase"("A", "B");

-- CreateIndex
CREATE INDEX "_MerchOptionToMerchPurchase_B_index" ON "_MerchOptionToMerchPurchase"("B");

-- AddForeignKey
ALTER TABLE "_MerchOptionToMerchPurchase" ADD CONSTRAINT "_MerchOptionToMerchPurchase_A_fkey" FOREIGN KEY ("A") REFERENCES "MerchOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MerchOptionToMerchPurchase" ADD CONSTRAINT "_MerchOptionToMerchPurchase_B_fkey" FOREIGN KEY ("B") REFERENCES "MerchPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
