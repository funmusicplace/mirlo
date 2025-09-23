-- CreateTable
CREATE TABLE "SubscriptionTierImage" (
    "imageId" UUID NOT NULL,
    "tierId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Image" (
    "id" UUID NOT NULL,
    "url" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "originalFilename" TEXT,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionTierImage_imageId_tierId_key" ON "SubscriptionTierImage"("imageId", "tierId");

-- AddForeignKey
ALTER TABLE "SubscriptionTierImage" ADD CONSTRAINT "SubscriptionTierImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionTierImage" ADD CONSTRAINT "SubscriptionTierImage_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "ArtistSubscriptionTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
