-- AlterTable
ALTER TABLE "MerchImage" ADD COLUMN     "imageId" UUID,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "MerchImage_imageId_key" ON "MerchImage"("imageId");

-- AddForeignKey
ALTER TABLE "MerchImage" ADD CONSTRAINT "MerchImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
