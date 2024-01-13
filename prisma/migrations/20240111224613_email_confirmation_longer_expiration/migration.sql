-- AlterTable
ALTER TABLE
  "ArtistUserSubscriptionConfirmation"
ALTER COLUMN
  "tokenExpiration" DROP NOT NULL,
ALTER COLUMN
  "tokenExpiration"
SET
  DEFAULT (NOW() + '01:00:00' :: interval);