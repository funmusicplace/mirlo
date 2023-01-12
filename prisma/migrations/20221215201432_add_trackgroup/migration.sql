-- CreateTable
CREATE TABLE "TrackGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "description" TEXT,
    "artistId" INTEGER NOT NULL,
    "title" TEXT,
    CONSTRAINT "TrackGroup_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackGroup_artistId_key" ON "TrackGroup"("artistId");
