/*
  Warnings:

  - A unique constraint covering the columns `[artistId,urlSlug]` on the table `TrackGroup` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `urlSlug` to the `TrackGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "properties" JSONB;

-- AlterTable
ALTER TABLE "TrackGroup" ADD COLUMN     "urlSlug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';

-- CreateIndex
CREATE UNIQUE INDEX "TrackGroup_artistId_urlSlug_key" ON "TrackGroup"("artistId", "urlSlug");
