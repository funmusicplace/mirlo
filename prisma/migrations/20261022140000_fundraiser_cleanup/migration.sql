-- DropForeignKey
ALTER TABLE "FundraiserPledge" DROP CONSTRAINT "FundraiserPledge_trackGroupId_fkey";

-- AlterTable
ALTER TABLE "TrackGroup" DROP COLUMN "fundraisingEndDate",
DROP COLUMN "fundraisingGoal",
DROP COLUMN "isAllOrNothing";

-- AlterTable
ALTER TABLE "Fundraiser" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FundraiserPledge" DROP COLUMN "trackGroupId";
