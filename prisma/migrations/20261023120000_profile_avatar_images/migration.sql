-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "avatarImageId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_avatarImageId_key" ON "Profile"("avatarImageId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_avatarImageId_fkey" FOREIGN KEY ("avatarImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Move live avatars onto Image rows. The files stay where they are, under
-- the artist-avatars/ prefix of the images bucket.
INSERT INTO "Image" ("id", "url", "createdAt", "updatedAt", "originalFilename", "dimensions", "profileId", "keyPrefix")
SELECT "id", "url", "createdAt", "updatedAt", "originalFilename", 'avatar', "profileId", 'artist-avatars'
FROM "ProfileAvatar"
WHERE "deletedAt" IS NULL
ON CONFLICT ("id") DO NOTHING;

UPDATE "Profile" AS p
SET "avatarImageId" = a."id"
FROM "ProfileAvatar" AS a
WHERE a."profileId" = p."id" AND a."deletedAt" IS NULL;
