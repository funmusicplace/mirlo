-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "currency" TEXT DEFAULT 'usd',
ADD COLUMN     "minPrice" INTEGER;
