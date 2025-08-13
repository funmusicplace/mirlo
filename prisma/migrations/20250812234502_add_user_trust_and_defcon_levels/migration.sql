-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "defconLevel" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trustLevel" INTEGER DEFAULT 0;
