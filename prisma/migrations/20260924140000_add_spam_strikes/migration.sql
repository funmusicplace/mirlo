-- AlterTable
ALTER TABLE "User" ADD COLUMN     "spamStrikes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ContentFlag" ADD COLUMN     "spamStrikeNumber" INTEGER;

-- CreateIndex
CREATE INDEX "ContentFlag_reportedUserId_idx" ON "ContentFlag"("reportedUserId");
