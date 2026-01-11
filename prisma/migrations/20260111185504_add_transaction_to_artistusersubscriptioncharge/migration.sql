-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "ArtistUserSubscriptionCharge" ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "UserTransaction" ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "ArtistUserSubscriptionCharge" ADD CONSTRAINT "ArtistUserSubscriptionCharge_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "UserTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
