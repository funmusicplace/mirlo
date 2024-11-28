/*
  Warnings:

  - You are about to drop the column `url` on the `PostImage` table. All the data in the column will be lost.
  - Added the required column `mimeType` to the `PostImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PostImage" DROP COLUMN "url",
ADD COLUMN     "mimeType" TEXT NOT NULL;
