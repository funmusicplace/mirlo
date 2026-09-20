-- AlterTable
ALTER TABLE "SubscriptionTierRelease" ADD COLUMN     "order" INTEGER;

UPDATE "SubscriptionTierRelease" AS r
SET "order" = ranked.rn
FROM (
  SELECT
    l."tierId",
    l."trackGroupId",
    ROW_NUMBER() OVER (
      PARTITION BY l."tierId"
      ORDER BY tg."releaseDate" DESC NULLS LAST, l."createdAt", l."trackGroupId"
    ) AS rn
  FROM "SubscriptionTierRelease" l
  JOIN "TrackGroup" tg ON tg.id = l."trackGroupId"
) AS ranked
WHERE r."tierId" = ranked."tierId" AND r."trackGroupId" = ranked."trackGroupId";
