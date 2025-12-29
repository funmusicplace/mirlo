-- AlterTable
ALTER TABLE "UserTrackGroupPurchase" ADD COLUMN     "associatedPledgeId" INTEGER;

-- AddForeignKey
ALTER TABLE "UserTrackGroupPurchase" ADD CONSTRAINT "UserTrackGroupPurchase_associatedPledgeId_fkey" FOREIGN KEY ("associatedPledgeId") REFERENCES "TrackGroupPledge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
