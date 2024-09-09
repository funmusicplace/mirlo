-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "allowPurchaseEntireCatalog" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "merchStoreURL" TEXT,
ADD COLUMN     "purchaseEntireCatalogMinPrice" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserArtistTip" ADD COLUMN     "artistTipTierId" INTEGER;

-- CreateTable
CREATE TABLE "ArtistTipTier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "artistId" INTEGER NOT NULL,
    "minAmount" INTEGER,
    "allowVariable" BOOLEAN,
    "maxAmount" INTEGER,
    "defaultAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripeProductKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "platformPercent" INTEGER DEFAULT 7,

    CONSTRAINT "ArtistTipTier_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ArtistTipTier" ADD CONSTRAINT "ArtistTipTier_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserArtistTip" ADD CONSTRAINT "UserArtistTip_artistTipTierId_fkey" FOREIGN KEY ("artistTipTierId") REFERENCES "ArtistTipTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
