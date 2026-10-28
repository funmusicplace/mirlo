-- CreateEnum
CREATE TYPE "ImageSlot" AS ENUM ('SPLASH');

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "splashImageId" UUID;

-- CreateTable
CREATE TABLE "PendingImage" (
    "slot" "ImageSlot" NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "imageId" UUID NOT NULL,

    CONSTRAINT "PendingImage_pkey" PRIMARY KEY ("slot","ownerId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_splashImageId_key" ON "Settings"("splashImageId");

-- CreateIndex
CREATE UNIQUE INDEX "PendingImage_imageId_key" ON "PendingImage"("imageId");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_splashImageId_fkey" FOREIGN KEY ("splashImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingImage" ADD CONSTRAINT "PendingImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
