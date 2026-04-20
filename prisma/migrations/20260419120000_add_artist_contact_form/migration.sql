-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ARTIST_CONTACT_MESSAGE';

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "allowDirectMessages" BOOLEAN NOT NULL DEFAULT true;
