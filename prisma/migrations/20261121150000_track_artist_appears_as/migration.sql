CREATE TYPE "TrackArtistAppearance" AS ENUM ('MAIN', 'FEATURED', 'CREDITS_ONLY');

ALTER TABLE "TrackArtist" ADD COLUMN "appearsAs" "TrackArtistAppearance" NOT NULL DEFAULT 'CREDITS_ONLY';

UPDATE "TrackArtist" AS ta
SET "appearsAs" = 'FEATURED'
FROM "Track" AS t
JOIN "TrackGroup" AS tg ON tg."id" = t."trackGroupId"
JOIN "Profile" AS p ON p."id" = tg."profileId"
WHERE ta."trackId" = t."id"
  AND ta."isCoAuthor" = true
  AND ta."artistId" IS DISTINCT FROM tg."profileId"
  AND lower(trim(coalesce(ta."artistName", ''))) <> lower(trim(p."name"));

CREATE TABLE "TrackGroupArtist" (
    "id" UUID NOT NULL,
    "trackGroupId" INTEGER NOT NULL,
    "artistName" TEXT NOT NULL,
    "profileId" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TrackGroupArtist_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrackGroupArtist_profileId_idx" ON "TrackGroupArtist"("profileId");

CREATE UNIQUE INDEX "TrackGroupArtist_trackGroupId_profileId_key" ON "TrackGroupArtist"("trackGroupId", "profileId");

ALTER TABLE "TrackGroupArtist" ADD CONSTRAINT "TrackGroupArtist_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrackGroupArtist" ADD CONSTRAINT "TrackGroupArtist_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
