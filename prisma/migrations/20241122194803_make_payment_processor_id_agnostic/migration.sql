/*
  Warnings:

  - You are about to drop the column `stripeId` on the `ArtistUserSubscriptionCharge` table. All the data in the column will be lost.
  - Added the required column `paymentProcessorId` to the `ArtistUserSubscriptionCharge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ArtistUserSubscriptionCharge" DROP COLUMN "stripeId",
ADD COLUMN     "paymentProcessorId" TEXT NOT NULL;
