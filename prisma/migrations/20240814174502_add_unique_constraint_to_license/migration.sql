/*
  Warnings:

  - A unique constraint covering the columns `[short]` on the table `License` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "License" ALTER COLUMN "link" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "License_short_key" ON "License"("short");
