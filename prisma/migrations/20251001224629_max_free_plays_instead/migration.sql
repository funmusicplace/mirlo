/*
  Warnings:

  - You are about to drop the column `playLimit` on the `Artist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Artist" DROP COLUMN "playLimit",
ADD COLUMN     "maxFreePlays" INTEGER;
