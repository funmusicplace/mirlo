/*
  Warnings:

  - You are about to drop the column `amountPaid` on the `ArtistUserSubscriptionCharge` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `ArtistUserSubscriptionCharge` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProcessor` on the `ArtistUserSubscriptionCharge` table. All the data in the column will be lost.
  - You are about to drop the column `paymentProcessorFee` on the `ArtistUserSubscriptionCharge` table. All the data in the column will be lost.
  - You are about to drop the column `platformCut` on the `ArtistUserSubscriptionCharge` table. All the data in the column will be lost.
  - You are about to drop the column `stripeInvoiceId` on the `ArtistUserSubscriptionCharge` table. All the data in the column will be lost.
  - You are about to drop the column `currencyPaid` on the `UserTrackPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `platformCut` on the `UserTrackPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `pricePaid` on the `UserTrackPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionKey` on the `UserTrackPurchase` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ArtistUserSubscriptionCharge" DROP COLUMN "amountPaid",
DROP COLUMN "currency",
DROP COLUMN "paymentProcessor",
DROP COLUMN "paymentProcessorFee",
DROP COLUMN "platformCut",
DROP COLUMN "stripeInvoiceId";

-- AlterTable
ALTER TABLE "UserTrackPurchase" DROP COLUMN "currencyPaid",
DROP COLUMN "platformCut",
DROP COLUMN "pricePaid",
DROP COLUMN "stripeSessionKey";
