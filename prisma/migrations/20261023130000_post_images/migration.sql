-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_featuredImageId_fkey";

-- AlterTable
ALTER TABLE "PostImage" ADD COLUMN     "imageId" UUID,
ALTER COLUMN "mimeType" DROP NOT NULL,
ALTER COLUMN "extension" DROP NOT NULL;

-- Move post images onto Image rows, deleted ones included so every link and
-- featured image keeps its target. The files stay where they are, under the
-- post-images/ prefix of the images bucket.
INSERT INTO "Image" ("id", "url", "createdAt", "updatedAt", "deletedAt", "dimensions", "profileId", "keyPrefix")
SELECT pi."id", ARRAY[pi."id"::text || '.' || pi."extension"], pi."createdAt", pi."updatedAt", pi."deletedAt", 'artwork', p."profileId", 'post-images'
FROM "PostImage" AS pi
JOIN "Post" AS p ON p."id" = pi."postId"
ON CONFLICT ("id") DO NOTHING;

UPDATE "PostImage" SET "imageId" = "id";

ALTER TABLE "PostImage" ALTER COLUMN "imageId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PostImage_imageId_key" ON "PostImage"("imageId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_featuredImageId_fkey" FOREIGN KEY ("featuredImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostImage" ADD CONSTRAINT "PostImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
