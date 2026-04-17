-- CreateEnum
CREATE TYPE "SubscriptionDeleteReason" AS ENUM ('USER_CANCELLED', 'TIER_SWITCHED', 'USER_ACCOUNT_DELETED', 'ADMIN_REMOVED', 'PAYMENT_FAILURE');

-- AlterTable
ALTER TABLE "ArtistUserSubscription" ADD COLUMN     "deleteReason" "SubscriptionDeleteReason";
