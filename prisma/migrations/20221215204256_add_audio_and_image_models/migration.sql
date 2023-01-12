-- CreateTable
CREATE TABLE "Image" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT,
    "trackGroupId" INTEGER NOT NULL,
    CONSTRAINT "Image_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Audio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT,
    "trackId" INTEGER NOT NULL,
    CONSTRAINT "Audio_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Image_trackGroupId_key" ON "Image"("trackGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Audio_trackId_key" ON "Audio"("trackId");
