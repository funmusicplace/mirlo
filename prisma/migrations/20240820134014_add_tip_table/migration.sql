-- CreateTable
CREATE TABLE "UserArtistTip" (
    "userId" INTEGER NOT NULL,
    "artistId" INTEGER NOT NULL,
    "pricePaid" INTEGER NOT NULL,
    "currencyPaid" TEXT NOT NULL DEFAULT 'USD',
    "datePurchased" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripeSessionKey" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "UserArtistTip_userId_artistId_key" ON "UserArtistTip"("userId", "artistId");

-- AddForeignKey
ALTER TABLE "UserArtistTip" ADD CONSTRAINT "UserArtistTip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserArtistTip" ADD CONSTRAINT "UserArtistTip_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
