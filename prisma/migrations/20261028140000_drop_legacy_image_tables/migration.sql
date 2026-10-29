-- DropForeignKey
ALTER TABLE "ProfileAvatar" DROP CONSTRAINT "ProfileAvatar_profileId_fkey";

-- DropForeignKey
ALTER TABLE "ProfileBackground" DROP CONSTRAINT "ProfileBackground_profileId_fkey";

-- DropForeignKey
ALTER TABLE "TrackGroupCover" DROP CONSTRAINT "TrackGroupCover_trackGroupId_fkey";

-- AlterTable
ALTER TABLE "PostImage" DROP COLUMN "extension",
DROP COLUMN "mimeType";

-- DropTable
DROP TABLE "ProfileAvatar";

-- DropTable
DROP TABLE "ProfileBackground";

-- DropTable
DROP TABLE "TrackGroupCover";
