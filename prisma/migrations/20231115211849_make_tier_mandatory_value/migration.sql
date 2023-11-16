/*
  Warnings:

  - Made the column `isDefaultTier` on table `ArtistSubscriptionTier` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ArtistSubscriptionTier" ALTER COLUMN "isDefaultTier" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "emailConfirmationExpiration" SET DEFAULT NOW() + interval '10 min';
