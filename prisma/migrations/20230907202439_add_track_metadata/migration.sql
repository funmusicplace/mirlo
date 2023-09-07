-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';

-- CreateTable
CREATE TABLE "TrackArtist" (
    "id" UUID NOT NULL,
    "trackId" INTEGER NOT NULL,
    "artistName" TEXT,
    "artistId" INTEGER,
    "role" TEXT,

    CONSTRAINT "TrackArtist_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TrackArtist" ADD CONSTRAINT "TrackArtist_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackArtist" ADD CONSTRAINT "TrackArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
