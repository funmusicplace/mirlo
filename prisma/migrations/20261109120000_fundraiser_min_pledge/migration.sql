-- AlterTable
ALTER TABLE "Fundraiser" ADD COLUMN "minPledge" INTEGER NOT NULL DEFAULT 0;

UPDATE "Fundraiser" f
SET "minPledge" = tg."minPrice"
FROM (
  SELECT DISTINCT ON ("fundraiserId") "fundraiserId", "minPrice"
  FROM "TrackGroup"
  WHERE "fundraiserId" IS NOT NULL AND "minPrice" IS NOT NULL
  ORDER BY "fundraiserId", "deletedAt" NULLS FIRST, id
) tg
WHERE tg."fundraiserId" = f.id;
