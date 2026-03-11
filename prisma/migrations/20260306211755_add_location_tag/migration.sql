-- CreateTable
CREATE TABLE "LocationTag" (
    "id" SERIAL NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "country" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistLocationTag" (
    "artistId" INTEGER NOT NULL,
    "locationTagId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LocationTag_slug_key" ON "LocationTag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LocationTag_city_region_country_key" ON "LocationTag"("city", "region", "country");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistLocationTag_artistId_locationTagId_key" ON "ArtistLocationTag"("artistId", "locationTagId");

-- AddForeignKey
ALTER TABLE "ArtistLocationTag" ADD CONSTRAINT "ArtistLocationTag_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistLocationTag" ADD CONSTRAINT "ArtistLocationTag_locationTagId_fkey" FOREIGN KEY ("locationTagId") REFERENCES "LocationTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
