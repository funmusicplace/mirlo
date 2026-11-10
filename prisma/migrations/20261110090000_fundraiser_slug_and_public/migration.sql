-- AlterTable
ALTER TABLE "Fundraiser" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "urlSlug" TEXT;

-- Existing fundraisers are already shown on their release pages
UPDATE "Fundraiser" SET "isPublic" = true;

DO $$
DECLARE
  fundraiser RECORD;
  candidate TEXT;
  suffix INTEGER;
BEGIN
  FOR fundraiser IN
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
        'fundraiser'
      ) AS base
    FROM "Fundraiser"
    ORDER BY "profileId", "createdAt", id
  LOOP
    candidate := fundraiser.base;
    suffix := 2;
    WHILE EXISTS (
      SELECT 1 FROM "Fundraiser"
      WHERE "profileId" = fundraiser."profileId" AND "urlSlug" = candidate
    ) LOOP
      candidate := fundraiser.base || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;
    UPDATE "Fundraiser" SET "urlSlug" = candidate WHERE id = fundraiser.id;
  END LOOP;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "Fundraiser_profileId_urlSlug_key" ON "Fundraiser"("profileId", "urlSlug");
