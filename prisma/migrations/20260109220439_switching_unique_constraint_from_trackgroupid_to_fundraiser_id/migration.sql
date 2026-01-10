/*
  Warnings:

  - A unique constraint covering the columns `[userId,fundraiserId]` on the table `FundraiserPledge` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FundraiserPledge" DROP CONSTRAINT "FundraiserPledge_trackGroupId_fkey";

-- DropIndex
DROP INDEX "FundraiserPledge_userId_trackGroupId_key";

-- DropIndex
DROP INDEX "TrackGroupPledge_userId_trackGroupId_key";

-- AlterTable
ALTER TABLE "FundraiserPledge" ALTER COLUMN "trackGroupId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FundraiserPledge_userId_fundraiserId_key" ON "FundraiserPledge"("userId", "fundraiserId");

-- AddForeignKey
ALTER TABLE "FundraiserPledge" ADD CONSTRAINT "FundraiserPledge_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
