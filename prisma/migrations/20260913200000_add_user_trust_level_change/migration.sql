-- CreateEnum
CREATE TYPE "TrustLevelChangeReason" AS ENUM ('ADMIN', 'PAYMENT_ACCOUNT_VERIFIED');

-- CreateTable
CREATE TABLE "UserTrustLevelChange" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fromLevel" INTEGER NOT NULL,
    "toLevel" INTEGER NOT NULL,
    "reason" "TrustLevelChangeReason" NOT NULL,
    "changedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTrustLevelChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserTrustLevelChange_userId_idx" ON "UserTrustLevelChange"("userId");

-- AddForeignKey
ALTER TABLE "UserTrustLevelChange" ADD CONSTRAINT "UserTrustLevelChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTrustLevelChange" ADD CONSTRAINT "UserTrustLevelChange_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
