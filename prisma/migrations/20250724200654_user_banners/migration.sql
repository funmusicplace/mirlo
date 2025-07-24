-- CreateTable
CREATE TABLE "UserBanner" (
    "id" UUID NOT NULL,
    "url" TEXT[],
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "originalFilename" TEXT,

    CONSTRAINT "UserBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBanner_userId_key" ON "UserBanner"("userId");

-- AddForeignKey
ALTER TABLE "UserBanner" ADD CONSTRAINT "UserBanner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
