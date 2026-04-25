-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "pendingEmailExpiration" TIMESTAMP(3),
ADD COLUMN     "pendingEmailToken" UUID;
