/*
  Warnings:

  - You are about to drop the column `payPalClientId` on the `Artist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Artist" DROP COLUMN "payPalClientId";

-- CreateTable
CREATE TABLE "ArtistSubscriptionTier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "artistId" INTEGER NOT NULL,
    "amount" TEXT NOT NULL,

    CONSTRAINT "ArtistSubscriptionTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistUserSubscription" (
    "id" SERIAL NOT NULL,
    "artistSubscriptionTierId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" TEXT NOT NULL,
    "stripeId" TEXT,

    CONSTRAINT "ArtistUserSubscription_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ArtistSubscriptionTier" ADD CONSTRAINT "ArtistSubscriptionTier_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistUserSubscription" ADD CONSTRAINT "ArtistUserSubscription_artistSubscriptionTierId_fkey" FOREIGN KEY ("artistSubscriptionTierId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistUserSubscription" ADD CONSTRAINT "ArtistUserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
