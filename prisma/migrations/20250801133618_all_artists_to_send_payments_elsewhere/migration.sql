-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "paymentToUserId" INTEGER;

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_paymentToUserId_fkey" FOREIGN KEY ("paymentToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
