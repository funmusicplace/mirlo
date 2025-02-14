-- AlterTable
ALTER TABLE "TrackGroup" ADD COLUMN     "paymentToUserId" INTEGER;

-- AddForeignKey
ALTER TABLE "TrackGroup" ADD CONSTRAINT "TrackGroup_paymentToUserId_fkey" FOREIGN KEY ("paymentToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
