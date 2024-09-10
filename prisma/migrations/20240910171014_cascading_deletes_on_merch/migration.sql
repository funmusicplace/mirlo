-- DropForeignKey
ALTER TABLE "MerchImage" DROP CONSTRAINT "MerchImage_merchId_fkey";

-- DropForeignKey
ALTER TABLE "MerchOption" DROP CONSTRAINT "MerchOption_merchOptionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "MerchOptionType" DROP CONSTRAINT "MerchOptionType_merchId_fkey";

-- DropForeignKey
ALTER TABLE "MerchShippingDestination" DROP CONSTRAINT "MerchShippingDestination_merchId_fkey";

-- AddForeignKey
ALTER TABLE "MerchImage" ADD CONSTRAINT "MerchImage_merchId_fkey" FOREIGN KEY ("merchId") REFERENCES "Merch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchShippingDestination" ADD CONSTRAINT "MerchShippingDestination_merchId_fkey" FOREIGN KEY ("merchId") REFERENCES "Merch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchOptionType" ADD CONSTRAINT "MerchOptionType_merchId_fkey" FOREIGN KEY ("merchId") REFERENCES "Merch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchOption" ADD CONSTRAINT "MerchOption_merchOptionTypeId_fkey" FOREIGN KEY ("merchOptionTypeId") REFERENCES "MerchOptionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
