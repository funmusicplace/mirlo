-- Fail early, with the offending profiles listed, if live profiles share a
-- urlSlug (compared case-insensitively). Resolve them by hand, then re-run.
DO $$
DECLARE
  duplicates TEXT;
BEGIN
  SELECT string_agg(
           format('%s (ids: %s)', slug, ids),
           E'\n'
         )
    INTO duplicates
    FROM (
      SELECT lower("urlSlug") AS slug,
             string_agg(id::text, ', ' ORDER BY id) AS ids
        FROM "Profile"
       WHERE "deletedAt" IS NULL
       GROUP BY lower("urlSlug")
      HAVING count(*) > 1
    ) d;

  IF duplicates IS NOT NULL THEN
    RAISE EXCEPTION E'Cannot add unique index on Profile.urlSlug, duplicate slugs:\n%', duplicates;
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_urlSlug_key" ON "Profile"("urlSlug") WHERE "deletedAt" IS NULL;
