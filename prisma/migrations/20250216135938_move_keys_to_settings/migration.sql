/*
  Warnings:

  - You are about to drop the column `privateKey` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `publicKey` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "privateKey",
DROP COLUMN "publicKey";

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "privateKey" TEXT,
ADD COLUMN     "publicKey" TEXT;
