-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "keyPrefix" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "backgroundImageId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_backgroundImageId_key" ON "Profile"("backgroundImageId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_backgroundImageId_fkey" FOREIGN KEY ("backgroundImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Move live backgrounds onto Image rows. The files stay where they are, under
-- the artist-banners/ prefix of the images bucket.
INSERT INTO "Image" ("id", "url", "createdAt", "updatedAt", "originalFilename", "dimensions", "profileId", "keyPrefix")
SELECT "id", "url", "createdAt", "updatedAt", "originalFilename", 'background', "profileId", 'artist-banners'
FROM "ProfileBackground"
WHERE "deletedAt" IS NULL
ON CONFLICT ("id") DO NOTHING;

UPDATE "Profile" AS p
SET "backgroundImageId" = b."id"
FROM "ProfileBackground" AS b
WHERE b."profileId" = p."id" AND b."deletedAt" IS NULL;
