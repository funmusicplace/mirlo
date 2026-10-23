-- AlterTable
ALTER TABLE "TrackGroup" ADD COLUMN     "coverImageId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "TrackGroup_coverImageId_key" ON "TrackGroup"("coverImageId");

-- AddForeignKey
ALTER TABLE "TrackGroup" ADD CONSTRAINT "TrackGroup_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Move live covers onto Image rows. The files stay where they are, under the
-- trackgroup-covers/ prefix of the images bucket.
INSERT INTO "Image" ("id", "url", "createdAt", "updatedAt", "originalFilename", "dimensions", "profileId", "keyPrefix")
SELECT c."id", c."url", c."createdAt", c."updatedAt", c."originalFilename", 'artwork', tg."profileId", 'trackgroup-covers'
FROM "TrackGroupCover" AS c
JOIN "TrackGroup" AS tg ON tg."id" = c."trackGroupId"
WHERE c."deletedAt" IS NULL
ON CONFLICT ("id") DO NOTHING;

UPDATE "TrackGroup" AS tg
SET "coverImageId" = c."id"
FROM "TrackGroupCover" AS c
WHERE c."trackGroupId" = tg."id" AND c."deletedAt" IS NULL;
