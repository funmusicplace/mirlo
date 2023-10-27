-- AlterTable
ALTER TABLE "TrackArtist" ADD COLUMN     "isCoAuthor" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
