-- AlterTable
ALTER TABLE "UserArtistTip" ADD COLUMN     "transactionId" TEXT;

-- AddForeignKey
ALTER TABLE "UserArtistTip" ADD CONSTRAINT "UserArtistTip_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "UserTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
