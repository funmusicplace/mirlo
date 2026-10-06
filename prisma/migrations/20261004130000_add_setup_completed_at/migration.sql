ALTER TABLE "Settings" ADD COLUMN "setupCompletedAt" TIMESTAMP(3);

UPDATE "Settings" SET "setupCompletedAt" = CURRENT_TIMESTAMP;
