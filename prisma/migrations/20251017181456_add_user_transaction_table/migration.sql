-- AlterTable
ALTER TABLE "UserTrackGroupPurchase" ADD COLUMN     "userTransactionId" TEXT;

-- CreateTable
CREATE TABLE "UserTransaction" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "platformCut" INTEGER,
    "stripeCut" INTEGER,
    "stripeId" TEXT,

    CONSTRAINT "UserTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserTrackGroupPurchase" ADD CONSTRAINT "UserTrackGroupPurchase_userTransactionId_fkey" FOREIGN KEY ("userTransactionId") REFERENCES "UserTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTransaction" ADD CONSTRAINT "UserTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert a UserTransaction row for each UserTrackGroupPurchase that doesn't have one yet
INSERT INTO "UserTransaction" ("id","userId","createdAt","amount","currency","platformCut","stripeId")
SELECT gen_random_uuid()::text, "userId", "datePurchased", "pricePaid", "currencyPaid", "platformCut", "stripeSessionKey"
FROM "UserTrackGroupPurchase"
WHERE "userTransactionId" IS NULL;

-- Link the newly created transactions back to the purchases
UPDATE "UserTrackGroupPurchase" ut
SET "userTransactionId" = t."id"
FROM "UserTransaction" t
WHERE ut."userTransactionId" IS NULL
    AND t."userId" = ut."userId"
    AND t."createdAt" = ut."datePurchased"
    AND t."amount" = ut."pricePaid"
    AND t."currency" = ut."currencyPaid"
    AND COALESCE(t."stripeId", '') = COALESCE(ut."stripeSessionKey", '');