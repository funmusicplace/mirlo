/*
 Warnings:
 
 - The values [DIGEST] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
 - You are about to drop the `UserNotificationSetting` table. If the table is not empty, all the data it contains will be lost.
 
 */
-- AlterEnum
BEGIN;

CREATE TYPE "NotificationType_new" AS ENUM (
  'MONTHLY_SUBSCRIPTION',
  'ARTIST_POSTS',
  'NEW_ALBUM'
);

ALTER TABLE
  "UserNotificationSetting"
ALTER COLUMN
  "notification" TYPE "NotificationType_new" USING ("notification" :: text :: "NotificationType_new");

ALTER TABLE
  "Notification"
ALTER COLUMN
  "notification" TYPE "NotificationType_new" USING ("notification" :: text :: "NotificationType_new");

ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";

ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";

DROP TYPE "NotificationType_old";

COMMIT;

-- DropForeignKey
ALTER TABLE
  "UserNotificationSetting" DROP CONSTRAINT "UserNotificationSetting_userId_fkey";

-- AlterTable
ALTER TABLE
  "Notification"
ADD
  COLUMN "content" TEXT,
ADD
  COLUMN "postId" INTEGER,
ADD
  COLUMN "subscriptionId" INTEGER,
ADD
  COLUMN "trackGroupId" INTEGER;

-- DropTable
DROP TABLE "UserNotificationSetting";

-- CreateTable
CREATE TABLE "UserArtistNotificationSetting" (
  "userId" INTEGER NOT NULL,
  "notification" "NotificationType" NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "artistId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "UserArtistNotificationSetting_userId_notification_key" ON "UserArtistNotificationSetting"("userId", "notification");

-- AddForeignKey
ALTER TABLE
  "UserArtistNotificationSetting"
ADD
  CONSTRAINT "UserArtistNotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "UserArtistNotificationSetting"
ADD
  CONSTRAINT "UserArtistNotificationSetting_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Notification"
ADD
  CONSTRAINT "Notification_trackGroupId_fkey" FOREIGN KEY ("trackGroupId") REFERENCES "TrackGroup"("id") ON DELETE
SET
  NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Notification"
ADD
  CONSTRAINT "Notification_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ArtistUserSubscription"("id") ON DELETE
SET
  NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Notification"
ADD
  CONSTRAINT "Notification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE
SET
  NULL ON UPDATE CASCADE;