/*
  Warnings:

  - The required column `id` was added to the `UserTrackGroupPurchase` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "UserTrackGroupPurchase" DROP CONSTRAINT "UserTrackGroupPurchase_trackGroupId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + '10 min'::interval;

-- AlterTable
ALTER TABLE "UserTrackGroupPurchase" ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "trackGroupId" DROP NOT NULL,
ADD CONSTRAINT "UserTrackGroupPurchase_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "UserTrackGroupPurchase" ADD CONSTRAINT "UserTrackGroupPurchase_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
