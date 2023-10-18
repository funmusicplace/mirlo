/*
  Warnings:

  - You are about to drop the column `forSubscribersOnly` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Post" DROP COLUMN "forSubscribersOnly",
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minimumSubscriptionTierId" INTEGER;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';

-- CreateTable
CREATE TABLE "PostSubscriptionTier" (
    "postId" INTEGER NOT NULL,
    "artistSubscriptionTierId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PostSubscriptionTier_postId_artistSubscriptionTierId_key" ON "PostSubscriptionTier"("postId", "artistSubscriptionTierId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_minimumSubscriptionTierId_fkey" FOREIGN KEY ("minimumSubscriptionTierId") REFERENCES "ArtistSubscriptionTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSubscriptionTier" ADD CONSTRAINT "PostSubscriptionTier_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSubscriptionTier" ADD CONSTRAINT "PostSubscriptionTier_artistSubscriptionTierId_fkey" FOREIGN KEY ("artistSubscriptionTierId") REFERENCES "ArtistSubscriptionTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
