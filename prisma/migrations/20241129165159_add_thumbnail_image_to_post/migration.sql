-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "thumbnailImageId" UUID;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_thumbnailImageId_fkey" FOREIGN KEY ("thumbnailImageId") REFERENCES "PostImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
