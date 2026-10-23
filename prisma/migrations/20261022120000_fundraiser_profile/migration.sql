-- AlterTable
ALTER TABLE "Fundraiser" ADD COLUMN "profileId" INTEGER;

UPDATE "Fundraiser" f
SET "profileId" = (
  SELECT tg."profileId" FROM "TrackGroup" tg
  WHERE tg."fundraiserId" = f.id
  ORDER BY tg."deletedAt" NULLS FIRST, tg.id
  LIMIT 1
);

-- A fundraiser with no release has no owner and could never be managed.
DELETE FROM "Fundraiser" f
WHERE f."profileId" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "FundraiserPledge" p WHERE p."fundraiserId" = f.id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Fundraiser" WHERE "profileId" IS NULL) THEN
    RAISE EXCEPTION 'Some fundraisers have pledges but no release to take an owner from. Set "Fundraiser"."profileId" for them by hand and re-run the migration.';
  END IF;
END $$;

-- Deleting a release cancels its pledges, but releases deleted before that
-- was added left them open.
UPDATE "FundraiserPledge" p
SET "cancelledAt" = NOW()
WHERE p."paidAt" IS NULL
  AND p."cancelledAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "TrackGroup" tg
    WHERE tg."fundraiserId" = p."fundraiserId" AND tg."deletedAt" IS NULL
  );

ALTER TABLE "Fundraiser" ALTER COLUMN "profileId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Fundraiser_profileId_idx" ON "Fundraiser"("profileId");

-- AddForeignKey
ALTER TABLE "Fundraiser" ADD CONSTRAINT "Fundraiser_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
