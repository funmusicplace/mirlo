-- CreateTable
CREATE TABLE "ArtistTourDate" (
    "id" SERIAL NOT NULL,
    "artistId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ticketsUrl" TEXT,

    CONSTRAINT "ArtistTourDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTrackGroupFavorite" (
    "userId" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTrackGroupFavorite_userId_trackId_key" ON "UserTrackGroupFavorite"("userId", "trackId");

-- AddForeignKey
ALTER TABLE "ArtistTourDate" ADD CONSTRAINT "ArtistTourDate_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrackGroupFavorite" ADD CONSTRAINT "UserTrackGroupFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrackGroupFavorite" ADD CONSTRAINT "UserTrackGroupFavorite_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
