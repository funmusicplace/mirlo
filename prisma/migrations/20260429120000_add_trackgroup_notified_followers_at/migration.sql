ALTER TABLE "TrackGroup" ADD COLUMN "notifiedFollowersAt" TIMESTAMP(3);

UPDATE "TrackGroup" SET "notifiedFollowersAt" = "publishedAt" WHERE "publishedAt" IS NOT NULL;
