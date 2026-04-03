-- AlterTable
ALTER TABLE "ArtistUserSubscription" ADD COLUMN     "nextBillingDate" TIMESTAMP(3),
ADD COLUMN     "renewalReminderSentAt" TIMESTAMP(3);
