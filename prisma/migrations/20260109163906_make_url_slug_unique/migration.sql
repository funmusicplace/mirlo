/*
  Warnings:

  - A unique constraint covering the columns `[urlSlug]` on the table `Artist` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Artist_urlSlug_key" ON "Artist"("urlSlug");
