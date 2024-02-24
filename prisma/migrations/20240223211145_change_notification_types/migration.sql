/*
 Warnings:
 
 - The values [MONTHLY_SUBSCRIPTION,ARTIST_POSTS,NEW_ALBUM] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
 - You are about to drop the column `notification` on the `Notification` table. All the data in the column will be lost.
 - Added the required column `notificationType` to the `Notification` table without a default value. This is not possible if the table is not empty.
 
 */
-- AlterEnum
BEGIN;

CREATE TYPE "NotificationType_new" AS ENUM (
  'NEW_ARTIST_MONTHLY_SUBSCRIPTION',
  'NEW_ARTIST_POST',
  'NEW_ARTIST_ALBUM'
);

ALTER TABLE
  "UserArtistNotificationSetting"
ALTER COLUMN
  "notification" TYPE "NotificationType_new" USING (
    "notification" :: text :: "NotificationType_new"
  );

ALTER TABLE
  "Notification"
ALTER COLUMN
  "notification" TYPE "NotificationType_new" USING (
    "notification" :: text :: "NotificationType_new"
  );

ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";

ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";

DROP TYPE "NotificationType_old";

COMMIT;

-- AlterTable
ALTER TABLE
  "Notification" DROP COLUMN "notification",
ADD
  COLUMN "notificationType" "NotificationType" NOT NULL;