-- AlterTable
ALTER TABLE "ProfileSubscriptionTier" ADD COLUMN     "urlSlug" TEXT;

UPDATE "ProfileSubscriptionTier" AS t
SET "urlSlug" = CASE
  WHEN ranked.rn = 1 THEN ranked.base
  ELSE ranked.base || '-' || ranked.rn
END
FROM (
  SELECT
    id,
    base,
    ROW_NUMBER() OVER (PARTITION BY "profileId", base ORDER BY "createdAt", id) AS rn
  FROM (
    SELECT
      id,
      "profileId",
      "createdAt",
      COALESCE(
        NULLIF(
          regexp_replace(
            regexp_replace(lower(name), '[^[:alnum:][:space:]_-]', '', 'g'),
            '[[:space:]]', '-', 'g'
          ),
          ''
        ),
        'tier'
      ) AS base
    FROM "ProfileSubscriptionTier"
  ) AS slugged
) AS ranked
WHERE t.id = ranked.id;

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSubscriptionTier_profileId_urlSlug_key" ON "ProfileSubscriptionTier"("profileId", "urlSlug");
