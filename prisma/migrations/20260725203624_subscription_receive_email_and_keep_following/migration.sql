-- AlterTable
ALTER TABLE "ProfileUserSubscription" ADD COLUMN     "keepFollowingOnCancel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiveEmail" BOOLEAN NOT NULL DEFAULT true;
