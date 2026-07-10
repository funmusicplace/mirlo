-- Rename columns where relation type changed Artist -> Profile
ALTER TABLE "ProfileAvatar" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "ProfileBackground" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "ProfileSubscriptionTier" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "ProfileUserSubscriptionConfirmation" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "ProfileTipTier" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "UserProfileTip" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "UserProfileTip" RENAME COLUMN "artistTipTierId" TO "profileTipTierId";
ALTER TABLE "ProfileLocationTag" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "TrackGroup" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "Merch" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "Post" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "Notification" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "UserProfileNotificationSetting" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "ActivityPubProfileFollowers" RENAME COLUMN "artistId" TO "profileId";
ALTER TABLE "PostSubscriptionTier" RENAME COLUMN "artistSubscriptionTierId" TO "profileSubscriptionTierId";
ALTER TABLE "ProfileUserSubscription" RENAME COLUMN "artistSubscriptionTierId" TO "profileSubscriptionTierId";
ALTER TABLE "ProfileUserSubscriptionCharge" RENAME COLUMN "artistUserSubscriptionId" TO "profileUserSubscriptionId";
