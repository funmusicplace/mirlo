-- CreateEnum
CREATE TYPE "NotificationDeliveryMethod" AS ENUM ('EMAIL', 'ACTIVITYPUB', 'BOTH');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "deliveryMethod" "NotificationDeliveryMethod" NOT NULL DEFAULT 'EMAIL';
