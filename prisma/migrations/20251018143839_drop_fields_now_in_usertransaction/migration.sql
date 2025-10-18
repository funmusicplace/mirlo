/*
  Warnings:

  - You are about to drop the column `currencyPaid` on the `UserTrackGroupPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `datePurchased` on the `UserTrackGroupPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `platformCut` on the `UserTrackGroupPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `pricePaid` on the `UserTrackGroupPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionKey` on the `UserTrackGroupPurchase` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserTrackGroupPurchase" DROP COLUMN "currencyPaid",
DROP COLUMN "datePurchased",
DROP COLUMN "platformCut",
DROP COLUMN "pricePaid",
DROP COLUMN "stripeSessionKey";
