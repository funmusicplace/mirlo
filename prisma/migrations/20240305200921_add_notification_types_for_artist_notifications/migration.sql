-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'USER_FOLLOWED_YOU';
ALTER TYPE "NotificationType" ADD VALUE 'USER_BOUGHT_YOUR_ALBUM';
ALTER TYPE "NotificationType" ADD VALUE 'USER_SUBSCRIBED_TO_YOU';
