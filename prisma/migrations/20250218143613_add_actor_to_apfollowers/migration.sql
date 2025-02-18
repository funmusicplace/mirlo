/*
  Warnings:

  - Added the required column `actor` to the `ActivityPubArtistFollowers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ActivityPubArtistFollowers" ADD COLUMN     "actor" TEXT NOT NULL;
