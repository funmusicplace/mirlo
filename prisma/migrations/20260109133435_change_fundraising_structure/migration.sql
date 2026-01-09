-- CreateEnum
CREATE TYPE "FundraiserStatus" AS ENUM ('ACTIVE', 'SUCCESSFUL', 'FAILED');

-- DropForeignKey
ALTER TABLE "TrackGroupPledge" DROP CONSTRAINT "TrackGroupPledge_associatedTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "TrackGroupPledge" DROP CONSTRAINT "TrackGroupPledge_trackGroupId_fkey";

-- DropForeignKey
ALTER TABLE "TrackGroupPledge" DROP CONSTRAINT "TrackGroupPledge_userId_fkey";

-- AlterTable
ALTER TABLE "TrackGroup" ADD COLUMN     "fundraiserId" INTEGER;

-- DropPrimaryKey
ALTER TABLE "TrackGroupPledge" DROP CONSTRAINT "TrackGroupPledge_pkey";

-- RenameTable
ALTER TABLE "TrackGroupPledge" RENAME TO "FundraiserPledge";

-- CreateTable
CREATE TABLE "Fundraiser" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "goalAmount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "endDate" TIMESTAMP(3),
    "status" "FundraiserStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Fundraiser_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "FundraiserPledge" ADD COLUMN     "fundraiserId" INTEGER NOT NULL;

-- AddPrimaryKey
ALTER TABLE "FundraiserPledge" ADD CONSTRAINT "FundraiserPledge_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "FundraiserPledge_associatedTransactionId_key" ON "FundraiserPledge"("associatedTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "FundraiserPledge_userId_trackGroupId_key" ON "FundraiserPledge"("userId", "trackGroupId");

-- AddForeignKey
ALTER TABLE "TrackGroup" ADD CONSTRAINT "TrackGroup_fundraiserId_fkey" FOREIGN KEY ("fundraiserId") REFERENCES "Fundraiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraiserPledge" ADD CONSTRAINT "FundraiserPledge_fundraiserId_fkey" FOREIGN KEY ("fundraiserId") REFERENCES "Fundraiser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraiserPledge" ADD CONSTRAINT "FundraiserPledge_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraiserPledge" ADD CONSTRAINT "FundraiserPledge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraiserPledge" ADD CONSTRAINT "FundraiserPledge_associatedTransactionId_fkey" FOREIGN KEY ("associatedTransactionId") REFERENCES "UserTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
