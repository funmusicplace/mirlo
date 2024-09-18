/*
  Warnings:

  - Added the required column `quantity` to the `MerchPurchase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MerchPurchase" ADD COLUMN     "quantity" INTEGER NOT NULL;
