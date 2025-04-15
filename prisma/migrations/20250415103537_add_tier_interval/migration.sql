-- CreateEnum
CREATE TYPE "Interval" AS ENUM ('MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" ADD COLUMN     "interval" "Interval" NOT NULL DEFAULT 'MONTH';
