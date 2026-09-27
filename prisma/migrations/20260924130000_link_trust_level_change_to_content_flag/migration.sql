-- AlterTable
ALTER TABLE "UserTrustLevelChange" ADD COLUMN     "contentFlagId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "UserTrustLevelChange_contentFlagId_key" ON "UserTrustLevelChange"("contentFlagId");

-- AddForeignKey
ALTER TABLE "UserTrustLevelChange" ADD CONSTRAINT "UserTrustLevelChange_contentFlagId_fkey" FOREIGN KEY ("contentFlagId") REFERENCES "ContentFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
