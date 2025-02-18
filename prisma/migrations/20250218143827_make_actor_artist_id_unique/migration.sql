/*
  Warnings:

  - The primary key for the `ActivityPubArtistFollowers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ActivityPubArtistFollowers` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[actor,artistId]` on the table `ActivityPubArtistFollowers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ActivityPubArtistFollowers" DROP CONSTRAINT "ActivityPubArtistFollowers_pkey",
DROP COLUMN "id";

-- CreateIndex
CREATE UNIQUE INDEX "ActivityPubArtistFollowers_actor_artistId_key" ON "ActivityPubArtistFollowers"("actor", "artistId");
