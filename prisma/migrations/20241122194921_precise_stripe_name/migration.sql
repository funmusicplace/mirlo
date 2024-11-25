/*
  Warnings:

  - You are about to drop the column `paymentProcessorId` on the `ArtistUserSubscriptionCharge` table. All the data in the column will be lost.
  - Added the required column `paymentProcessor` to the `ArtistUserSubscriptionCharge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ArtistUserSubscriptionCharge" DROP COLUMN "paymentProcessorId",
ADD COLUMN     "paymentProcessor" TEXT NOT NULL,
ADD COLUMN     "stripeInvoiceId" TEXT;
