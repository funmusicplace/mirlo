-- CreateTable
CREATE TABLE "FundraiserImage" (
    "id" UUID NOT NULL,
    "fundraiserId" INTEGER NOT NULL,
    "imageId" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundraiserImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FundraiserImage_imageId_key" ON "FundraiserImage"("imageId");

-- CreateIndex
CREATE INDEX "FundraiserImage_fundraiserId_idx" ON "FundraiserImage"("fundraiserId");

-- AddForeignKey
ALTER TABLE "FundraiserImage" ADD CONSTRAINT "FundraiserImage_fundraiserId_fkey" FOREIGN KEY ("fundraiserId") REFERENCES "Fundraiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundraiserImage" ADD CONSTRAINT "FundraiserImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
