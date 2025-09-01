/*
  Warnings:

  - You are about to drop the column `stripeSetupIntent` on the `TrackGroupPledge` table. All the data in the column will be lost.
  - Added the required column `stripeSetupIntentId` to the `TrackGroupPledge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TrackGroupPledge" DROP COLUMN "stripeSetupIntent",
ADD COLUMN     "stripeSetupIntentId" TEXT NOT NULL;
