-- CreateTable
CREATE TABLE "PostTrack" (
    "trackId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PostTrack_trackId_postId_key" ON "PostTrack"("trackId", "postId");

-- AddForeignKey
ALTER TABLE "PostTrack" ADD CONSTRAINT "PostTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTrack" ADD CONSTRAINT "PostTrack_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
