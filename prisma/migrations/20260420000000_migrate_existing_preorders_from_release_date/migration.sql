-- Migrate existing implicit pre-orders (published albums with a future release
-- date) to the new explicit isPreorder flag, and schedule them to auto-end on
-- that date to preserve the previous behavior.
UPDATE "TrackGroup"
SET "isPreorder" = true,
    "scheduleEndOnReleaseDate" = true
WHERE "releaseDate" IS NOT NULL
  AND "releaseDate" > NOW()
  AND "publishedAt" IS NOT NULL
  AND "publishedAt" <= NOW();
