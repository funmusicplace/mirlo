ALTER TYPE "NotificationType" ADD VALUE 'AP_MENTION';

ALTER TABLE "Profile" ADD COLUMN "allowFediverseMentions" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Notification_notificationType_idx" ON "Notification"("notificationType");
