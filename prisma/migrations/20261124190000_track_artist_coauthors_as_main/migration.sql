UPDATE "TrackArtist" SET "appearsAs" = 'MAIN' WHERE "appearsAs" = 'FEATURED';

UPDATE "TrackArtist" AS ta
SET "appearsAs" = 'MAIN'
WHERE ta."appearsAs" = 'CREDITS_ONLY'
  AND ta."isCoAuthor" = true
  AND EXISTS (
    SELECT 1 FROM "TrackArtist" AS other
    WHERE other."trackId" = ta."trackId"
      AND other."id" <> ta."id"
      AND other."isCoAuthor" = true
  );
