-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "licenseId" INTEGER;

-- CreateTable
CREATE TABLE "License" (
    "id" SERIAL NOT NULL,
    "short" TEXT NOT NULL,
    "link" TEXT NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;
