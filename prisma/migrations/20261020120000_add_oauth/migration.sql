-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "clientIdUrl" TEXT,
ADD COLUMN     "confidential" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "redirectUris" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "OAuthPayload" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "grantId" TEXT,
    "uid" TEXT,
    "accountId" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "OAuthPayload_pkey" PRIMARY KEY ("model","id")
);

-- CreateTable
CREATE TABLE "OAuthKey" (
    "kind" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthKey_pkey" PRIMARY KEY ("kind")
);

-- CreateIndex
CREATE INDEX "OAuthPayload_grantId_idx" ON "OAuthPayload"("grantId");

-- CreateIndex
CREATE INDEX "OAuthPayload_uid_idx" ON "OAuthPayload"("uid");

-- CreateIndex
CREATE INDEX "OAuthPayload_accountId_model_idx" ON "OAuthPayload"("accountId", "model");

-- CreateIndex
CREATE INDEX "OAuthPayload_expiresAt_idx" ON "OAuthPayload"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_clientIdUrl_key" ON "Client"("clientIdUrl");

