/*
  Warnings:

  - You are about to drop the column `artistId` on the `ArtistUserSubscription` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ArtistUserSubscription" DROP CONSTRAINT "ArtistUserSubscription_artistId_fkey";

-- AlterTable
ALTER TABLE "ArtistUserSubscription" DROP COLUMN "artistId";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
