-- AlterTable
ALTER TABLE "ArtistUserSubscriptionConfirmation" ALTER COLUMN "tokenExpiration" SET DEFAULT (NOW() + '06:00:00'::interval);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT (NOW() + '00:20:00'::interval);
