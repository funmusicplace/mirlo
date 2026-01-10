/*
  Warnings:

  - A unique constraint covering the columns `[urlSlug,deletedAt]` on the table `Artist` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Artist_urlSlug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Artist_urlSlug_deletedAt_key" ON "Artist"("urlSlug", "deletedAt");
