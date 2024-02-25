/*
  Warnings:

  - You are about to drop the `UserNotification` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NEW_ALBUM';

-- DropForeignKey
ALTER TABLE "UserNotification" DROP CONSTRAINT "UserNotification_userId_fkey";

-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" ALTER COLUMN "platformPercent" SET DEFAULT 7;

-- AlterTable
ALTER TABLE "TrackGroup" ALTER COLUMN "platformPercent" SET DEFAULT 7;

-- DropTable
DROP TABLE "UserNotification";

-- CreateTable
CREATE TABLE "UserNotificationSetting" (
    "userId" INTEGER NOT NULL,
    "notification" "NotificationType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "notification" "NotificationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationSetting_userId_notification_key" ON "UserNotificationSetting"("userId", "notification");

-- AddForeignKey
ALTER TABLE "UserNotificationSetting" ADD CONSTRAINT "UserNotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
