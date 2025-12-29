/*
  Warnings:

  - You are about to drop the column `associatedPledgeId` on the `UserTrackGroupPurchase` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[associatedTransactionId]` on the table `TrackGroupPledge` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "UserTrackGroupPurchase" DROP CONSTRAINT "UserTrackGroupPurchase_associatedPledgeId_fkey";

-- AlterTable
ALTER TABLE "TrackGroupPledge" ADD COLUMN     "associatedTransactionId" TEXT;

-- AlterTable
ALTER TABLE "UserTrackGroupPurchase" DROP COLUMN "associatedPledgeId";

-- CreateIndex
CREATE UNIQUE INDEX "TrackGroupPledge_associatedTransactionId_key" ON "TrackGroupPledge"("associatedTransactionId");

-- AddForeignKey
ALTER TABLE "TrackGroupPledge" ADD CONSTRAINT "TrackGroupPledge_associatedTransactionId_fkey" FOREIGN KEY ("associatedTransactionId") REFERENCES "UserTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
