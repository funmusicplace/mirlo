-- DropForeignKey
ALTER TABLE "MerchPurchase" DROP CONSTRAINT "MerchPurchase_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserProfileTip" DROP CONSTRAINT "UserProfileTip_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserTransaction" DROP CONSTRAINT "UserTransaction_userId_fkey";

-- AlterTable
ALTER TABLE "MerchPurchase" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserProfileTip" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserTransaction" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "MerchPurchase" ADD CONSTRAINT "MerchPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfileTip" ADD CONSTRAINT "UserProfileTip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTransaction" ADD CONSTRAINT "UserTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
