-- AlterTable
ALTER TABLE "UserTrackGroupPurchase" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Populate createdAt from the referenced UserTransaction
UPDATE "UserTrackGroupPurchase" tp
SET "createdAt" = ut."createdAt"
FROM "UserTransaction" ut
WHERE tp."userTransactionId" = ut."id";