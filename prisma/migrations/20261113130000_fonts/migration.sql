-- CreateEnum
CREATE TYPE "FontCategory" AS ENUM ('sans', 'serif', 'mono', 'display', 'handwriting');

-- CreateEnum
CREATE TYPE "FontStyle" AS ENUM ('normal', 'italic');

-- CreateEnum
CREATE TYPE "FontFormat" AS ENUM ('woff2', 'woff', 'ttf', 'otf');

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "bodyFontId" UUID,
ADD COLUMN     "headingFontId" UUID;

-- CreateTable
CREATE TABLE "Font" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FontCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Font_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FontFile" (
    "id" UUID NOT NULL,
    "fontId" UUID NOT NULL,
    "format" "FontFormat" NOT NULL,
    "weightMin" INTEGER NOT NULL,
    "weightMax" INTEGER NOT NULL,
    "style" "FontStyle" NOT NULL,
    "scripts" TEXT[],
    "ascentOverride" DOUBLE PRECISION,
    "descentOverride" DOUBLE PRECISION,
    "byteSize" INTEGER NOT NULL,
    "originalFilename" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FontFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FontFile_fontId_idx" ON "FontFile"("fontId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_headingFontId_key" ON "Settings"("headingFontId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_bodyFontId_key" ON "Settings"("bodyFontId");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_headingFontId_fkey" FOREIGN KEY ("headingFontId") REFERENCES "Font"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_bodyFontId_fkey" FOREIGN KEY ("bodyFontId") REFERENCES "Font"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FontFile" ADD CONSTRAINT "FontFile_fontId_fkey" FOREIGN KEY ("fontId") REFERENCES "Font"("id") ON DELETE CASCADE ON UPDATE CASCADE;

