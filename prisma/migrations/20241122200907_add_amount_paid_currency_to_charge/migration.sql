/*
  Warnings:

  - Added the required column `amountPaid` to the `ArtistUserSubscriptionCharge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `ArtistUserSubscriptionCharge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ArtistUserSubscriptionCharge" ADD COLUMN     "amountPaid" INTEGER NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL;
