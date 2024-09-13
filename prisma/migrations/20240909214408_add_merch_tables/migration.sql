-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('NO_PROGRESS', 'STARTED', 'SHIPPED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Merch" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minPrice" INTEGER NOT NULL,
    "quantityRemaining" INTEGER NOT NULL,
    "startShippingDate" TIMESTAMP(3),
    "sku" TEXT NOT NULL,
    "includePurchaseTrackGroupId" BOOLEAN NOT NULL,
    "isPublic" BOOLEAN NOT NULL,
    "itemTypeId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Merch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchItemType" (
    "name" TEXT NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "MerchItemType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchImage" (
    "id" UUID NOT NULL,
    "merchId" UUID NOT NULL,
    "url" TEXT[],

    CONSTRAINT "MerchImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchShippingDestination" (
    "id" UUID NOT NULL,
    "homeCountry" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "merchId" UUID NOT NULL,
    "costUnit" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "costExtraUnit" INTEGER NOT NULL,

    CONSTRAINT "MerchShippingDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchOptionType" (
    "id" UUID NOT NULL,
    "optionName" TEXT NOT NULL,
    "merchId" UUID NOT NULL,

    CONSTRAINT "MerchOptionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchOption" (
    "id" UUID NOT NULL,
    "merchOptionTypeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "quantityRemaining" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,

    CONSTRAINT "MerchOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchPurchase" (
    "id" UUID NOT NULL,
    "merchId" UUID NOT NULL,
    "currencyPaid" TEXT NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "stripeTransactionKey" TEXT,
    "userId" INTEGER NOT NULL,
    "shippingAddress" JSONB,
    "billingAddress" JSONB,
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL,

    CONSTRAINT "MerchPurchase_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Merch" ADD CONSTRAINT "Merch_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "MerchItemType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchImage" ADD CONSTRAINT "MerchImage_merchId_fkey" FOREIGN KEY ("merchId") REFERENCES "Merch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchShippingDestination" ADD CONSTRAINT "MerchShippingDestination_merchId_fkey" FOREIGN KEY ("merchId") REFERENCES "Merch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchOptionType" ADD CONSTRAINT "MerchOptionType_merchId_fkey" FOREIGN KEY ("merchId") REFERENCES "Merch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchOption" ADD CONSTRAINT "MerchOption_merchOptionTypeId_fkey" FOREIGN KEY ("merchOptionTypeId") REFERENCES "MerchOptionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchPurchase" ADD CONSTRAINT "MerchPurchase_merchId_fkey" FOREIGN KEY ("merchId") REFERENCES "Merch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchPurchase" ADD CONSTRAINT "MerchPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
