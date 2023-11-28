-- DropForeignKey
ALTER TABLE "TrackPlay" DROP CONSTRAINT "TrackPlay_userId_fkey";

-- AlterTable
ALTER TABLE "TrackPlay" ADD COLUMN     "ip" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + '10 min'::interval;

-- AddForeignKey
ALTER TABLE "TrackPlay" ADD CONSTRAINT "TrackPlay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
