-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "links" TEXT[];

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
