-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "logoId" UUID,
ADD COLUMN     "mobileLogoId" UUID;

-- CreateTable
CREATE TABLE "InstanceLogo" (
    "id" UUID NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "originalFilename" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstanceLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_logoId_key" ON "Settings"("logoId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_mobileLogoId_key" ON "Settings"("mobileLogoId");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "InstanceLogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_mobileLogoId_fkey" FOREIGN KEY ("mobileLogoId") REFERENCES "InstanceLogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
