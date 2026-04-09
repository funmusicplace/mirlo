/*
  Warnings:

  - You are about to drop the column `billingEmail` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "billingEmail",
ADD COLUMN     "accountingEmail" TEXT;
