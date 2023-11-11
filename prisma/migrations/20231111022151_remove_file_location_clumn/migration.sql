/*
  Warnings:

  - You are about to drop the column `incomingFileLocation` on the `TrackAudio` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TrackAudio" DROP COLUMN "incomingFileLocation";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
