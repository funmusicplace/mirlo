/*
  Warnings:

  - A unique constraint covering the columns `[urlSlug]` on the table `Artist` will be added. If there are existing duplicate values, this will fail.
  - Made the column `urlSlug` on table `Artist` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Artist" ALTER COLUMN "urlSlug" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';

-- CreateIndex
CREATE UNIQUE INDEX "Artist_urlSlug_key" ON "Artist"("urlSlug");
