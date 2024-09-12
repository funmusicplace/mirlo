/*
  Warnings:

  - The required column `id` was added to the `UserArtistTip` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropIndex
DROP INDEX "UserArtistTip_userId_artistId_key";

-- AlterTable
ALTER TABLE "UserArtistTip" ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "UserArtistTip_pkey" PRIMARY KEY ("id");
