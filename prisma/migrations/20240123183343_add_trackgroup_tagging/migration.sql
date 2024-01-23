-- CreateTable
CREATE TABLE "TrackGroupTag" (
    "trackGroupId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackGroupTag_trackGroupId_tagId_key" ON "TrackGroupTag"("trackGroupId", "tagId");

-- AddForeignKey
ALTER TABLE "TrackGroupTag" ADD CONSTRAINT "TrackGroupTag_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackGroupTag" ADD CONSTRAINT "TrackGroupTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
