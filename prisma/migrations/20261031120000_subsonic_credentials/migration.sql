-- CreateTable
CREATE TABLE "SubsonicCredential" (
    "id" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "secret" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubsonicCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubsonicCredential_userId_key" ON "SubsonicCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SubsonicCredential_secretHash_key" ON "SubsonicCredential"("secretHash");

-- AddForeignKey
ALTER TABLE "SubsonicCredential" ADD CONSTRAINT "SubsonicCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
