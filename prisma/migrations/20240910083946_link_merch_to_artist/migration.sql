/*
  Warnings:

  - Added the required column `artistId` to the `Merch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Merch" ADD COLUMN     "artistId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Merch" ADD CONSTRAINT "Merch_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
