-- CreateTable
CREATE TABLE "ArtistCover" (
    "id" UUID NOT NULL,
    "url" TEXT[],
    "artistId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "originalFilename" TEXT,

    CONSTRAINT "ArtistCover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistBanner" (
    "id" UUID NOT NULL,
    "url" TEXT[],
    "artistId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "originalFilename" TEXT,

    CONSTRAINT "ArtistBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistCover_artistId_key" ON "ArtistCover"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistBanner_artistId_key" ON "ArtistBanner"("artistId");

-- AddForeignKey
ALTER TABLE "ArtistCover" ADD CONSTRAINT "ArtistCover_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistBanner" ADD CONSTRAINT "ArtistBanner_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
