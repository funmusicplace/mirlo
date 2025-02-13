-- CreateTable
CREATE TABLE "ArtistLabel" (
    "artistId" INTEGER NOT NULL,
    "labelUserId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistLabel_labelUserId_artistId_key" ON "ArtistLabel"("labelUserId", "artistId");

-- AddForeignKey
ALTER TABLE "ArtistLabel" ADD CONSTRAINT "ArtistLabel_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistLabel" ADD CONSTRAINT "ArtistLabel_labelUserId_fkey" FOREIGN KEY ("labelUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
