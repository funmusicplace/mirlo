-- DropForeignKey
ALTER TABLE "Merch" DROP CONSTRAINT "Merch_itemTypeId_fkey";

-- AlterTable
ALTER TABLE "Merch" ALTER COLUMN "itemTypeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Merch" ADD CONSTRAINT "Merch_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "MerchItemType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
