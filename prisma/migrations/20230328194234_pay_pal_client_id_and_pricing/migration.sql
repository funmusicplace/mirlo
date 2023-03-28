-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "payPalClientId" TEXT;

-- AlterTable
ALTER TABLE "TrackGroup" ADD COLUMN     "isPriceFixed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minPrice" TEXT;
