/*
  Warnings:

  - You are about to drop the column `description` on the `TrackGroup` table. All the data in the column will be lost.
  - Added the required column `name` to the `Artist` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Artist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "userId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Artist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Artist" ("bio", "id", "userId") SELECT "bio", "id", "userId" FROM "Artist";
DROP TABLE "Artist";
ALTER TABLE "new_Artist" RENAME TO "Artist";
CREATE UNIQUE INDEX "Artist_userId_key" ON "Artist"("userId");
CREATE TABLE "new_TrackGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "about" TEXT,
    "artistId" INTEGER NOT NULL,
    "title" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT,
    "releaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TrackGroup_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TrackGroup" ("artistId", "id", "title") SELECT "artistId", "id", "title" FROM "TrackGroup";
DROP TABLE "TrackGroup";
ALTER TABLE "new_TrackGroup" RENAME TO "TrackGroup";
CREATE UNIQUE INDEX "TrackGroup_artistId_key" ON "TrackGroup"("artistId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
