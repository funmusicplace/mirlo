-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_thumbnailImageId_fkey";

-- AlterTable
ALTER TABLE "Post"  
RENAME COLUMN "thumbnailImageId" to "featuredImageId";

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_featuredImageId_fkey" FOREIGN KEY ("featuredImageId") REFERENCES "PostImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
