-- CreateTable
CREATE TABLE "Track" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trackGroupId" INTEGER NOT NULL,
    "title" TEXT,
    CONSTRAINT "Track_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Track_trackGroupId_key" ON "Track"("trackGroupId");
