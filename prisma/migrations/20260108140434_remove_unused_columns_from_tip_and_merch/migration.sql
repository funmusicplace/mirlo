/*
  Warnings:

  - You are about to drop the column `amountPaid` on the `MerchPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `currencyPaid` on the `MerchPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `platformCut` on the `MerchPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `stripeTransactionKey` on the `MerchPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `currencyPaid` on the `UserArtistTip` table. All the data in the column will be lost.
  - You are about to drop the column `platformCut` on the `UserArtistTip` table. All the data in the column will be lost.
  - You are about to drop the column `pricePaid` on the `UserArtistTip` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionKey` on the `UserArtistTip` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MerchPurchase" DROP COLUMN "amountPaid",
DROP COLUMN "currencyPaid",
DROP COLUMN "platformCut",
DROP COLUMN "stripeTransactionKey";

-- AlterTable
ALTER TABLE "UserArtistTip" DROP COLUMN "currencyPaid",
DROP COLUMN "platformCut",
DROP COLUMN "pricePaid",
DROP COLUMN "stripeSessionKey";
