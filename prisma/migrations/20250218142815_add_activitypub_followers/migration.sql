-- CreateTable
CREATE TABLE "ActivityPubArtistFollowers" (
    "id" TEXT NOT NULL,
    "artistId" INTEGER NOT NULL,

    CONSTRAINT "ActivityPubArtistFollowers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ActivityPubArtistFollowers" ADD CONSTRAINT "ActivityPubArtistFollowers_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
