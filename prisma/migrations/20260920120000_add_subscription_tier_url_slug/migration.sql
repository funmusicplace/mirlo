-- AlterTable
ALTER TABLE "ProfileSubscriptionTier" ADD COLUMN     "urlSlug" TEXT;

DO $$
DECLARE
  tier RECORD;
  candidate TEXT;
  suffix INTEGER;
BEGIN
  FOR tier IN
    SELECT
      id,
      "profileId",
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
    ORDER BY "profileId", "createdAt", id
  LOOP
    candidate := tier.base;
    suffix := 2;
    WHILE EXISTS (
      SELECT 1 FROM "ProfileSubscriptionTier"
      WHERE "profileId" = tier."profileId" AND "urlSlug" = candidate
    ) LOOP
      candidate := tier.base || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;
    UPDATE "ProfileSubscriptionTier" SET "urlSlug" = candidate WHERE id = tier.id;
  END LOOP;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSubscriptionTier_profileId_urlSlug_key" ON "ProfileSubscriptionTier"("profileId", "urlSlug");
