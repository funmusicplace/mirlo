/*
  Warnings:

  - You are about to drop the column `orderId` on the `PostTrack` table. All the data in the column will be lost.
  - Added the required column `order` to the `PostTrack` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PostTrack" DROP COLUMN "orderId",
ADD COLUMN     "order" INTEGER NOT NULL;
