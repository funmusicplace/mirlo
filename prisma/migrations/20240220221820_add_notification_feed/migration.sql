-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DIGEST', 'MONTHLY_SUBSCRIPTION', 'ARTIST_POSTS');

-- CreateTable
CREATE TABLE "UserNotification" (
    "userId" INTEGER NOT NULL,
    "notification" "NotificationType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNotification_userId_notification_key" ON "UserNotification"("userId", "notification");

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
