-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_MANAGER_INVITE';

-- CreateTable
CREATE TABLE "ProfileManager" (
    "profileId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileManager_pkey" PRIMARY KEY ("profileId","userId")
);

-- CreateIndex
CREATE INDEX "ProfileManager_userId_idx" ON "ProfileManager"("userId");

-- AddForeignKey
ALTER TABLE "ProfileManager" ADD CONSTRAINT "ProfileManager_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileManager" ADD CONSTRAINT "ProfileManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileManager" ADD CONSTRAINT "ProfileManager_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
