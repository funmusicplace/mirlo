/*
  Warnings:

  - A unique constraint covering the columns `[tag]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Tag_tag_key" ON "Tag"("tag");
