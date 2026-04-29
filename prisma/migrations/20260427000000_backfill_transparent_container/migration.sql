-- Backfill `properties.transparentContainer = true` for artists who relied on
-- the pre-existing "undefined background = transparent" hack: they have a
-- background image uploaded but never set `colors.background`, so the page
-- background was transparent and the bg image showed through.
--
-- The `container` color slot is introduced in the same release. Without this
-- backfill, the new cascade `container <- background` would fall back to the
-- Mirlo default background and cover the artist's bg image, which is a
-- regression for these artists.
--
-- All other artists get `transparentContainer = false` implicitly (we omit
-- the key, the type defaults to undefined which is treated as false).

UPDATE "Artist" a
SET properties = jsonb_set(
  COALESCE(a.properties, '{}'::jsonb),
  '{transparentContainer}',
  'true'::jsonb,
  true
)
WHERE EXISTS (
  SELECT 1 FROM "ArtistBackground" ab
  WHERE ab."artistId" = a.id AND ab."deletedAt" IS NULL
)
AND (
  a.properties IS NULL
  OR a.properties -> 'colors' IS NULL
  OR (a.properties -> 'colors' ->> 'background') IS NULL
);
