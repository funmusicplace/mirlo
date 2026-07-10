-- RenameForeignKey
ALTER TABLE "ActivityPubProfileFollowers" RENAME CONSTRAINT "ActivityPubProfileFollowers_artistId_fkey" TO "ActivityPubProfileFollowers_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "Merch" RENAME CONSTRAINT "Merch_artistId_fkey" TO "Merch_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "Notification" RENAME CONSTRAINT "Notification_artistId_fkey" TO "Notification_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "Post" RENAME CONSTRAINT "Post_artistId_fkey" TO "Post_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "PostSubscriptionTier" RENAME CONSTRAINT "PostSubscriptionTier_artistSubscriptionTierId_fkey" TO "PostSubscriptionTier_profileSubscriptionTierId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileAvatar" RENAME CONSTRAINT "ProfileAvatar_artistId_fkey" TO "ProfileAvatar_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileBackground" RENAME CONSTRAINT "ProfileBackground_artistId_fkey" TO "ProfileBackground_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileLocationTag" RENAME CONSTRAINT "ProfileLocationTag_artistId_fkey" TO "ProfileLocationTag_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileSubscriptionTier" RENAME CONSTRAINT "ProfileSubscriptionTier_artistId_fkey" TO "ProfileSubscriptionTier_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileTipTier" RENAME CONSTRAINT "ProfileTipTier_artistId_fkey" TO "ProfileTipTier_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileUserSubscription" RENAME CONSTRAINT "ProfileUserSubscription_artistSubscriptionTierId_fkey" TO "ProfileUserSubscription_profileSubscriptionTierId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileUserSubscriptionCharge" RENAME CONSTRAINT "ProfileUserSubscriptionCharge_artistUserSubscriptionId_fkey" TO "ProfileUserSubscriptionCharge_profileUserSubscriptionId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileUserSubscriptionConfirmation" RENAME CONSTRAINT "ProfileUserSubscriptionConfirmation_artistId_fkey" TO "ProfileUserSubscriptionConfirmation_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "TrackGroup" RENAME CONSTRAINT "TrackGroup_artistId_fkey" TO "TrackGroup_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "UserProfileNotificationSetting" RENAME CONSTRAINT "UserProfileNotificationSetting_artistId_fkey" TO "UserProfileNotificationSetting_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "UserProfileTip" RENAME CONSTRAINT "UserProfileTip_artistId_fkey" TO "UserProfileTip_profileId_fkey";

-- RenameForeignKey
ALTER TABLE "UserProfileTip" RENAME CONSTRAINT "UserProfileTip_artistTipTierId_fkey" TO "UserProfileTip_profileTipTierId_fkey";

-- RenameIndex
ALTER INDEX "ActivityPubProfileFollowers_actor_artistId_key" RENAME TO "ActivityPubProfileFollowers_actor_profileId_key";

-- RenameIndex
ALTER INDEX "PostSubscriptionTier_postId_artistSubscriptionTierId_key" RENAME TO "PostSubscriptionTier_postId_profileSubscriptionTierId_key";

-- RenameIndex
ALTER INDEX "ProfileAvatar_artistId_key" RENAME TO "ProfileAvatar_profileId_key";

-- RenameIndex
ALTER INDEX "ProfileBackground_artistId_key" RENAME TO "ProfileBackground_profileId_key";

-- RenameIndex
ALTER INDEX "ProfileLocationTag_artistId_locationTagId_key" RENAME TO "ProfileLocationTag_profileId_locationTagId_key";

-- RenameIndex
ALTER INDEX "ProfileUserSubscription_userId_artistSubscriptionTierId_key" RENAME TO "ProfileUserSubscription_userId_profileSubscriptionTierId_key";

-- RenameIndex
ALTER INDEX "ProfileUserSubscriptionConfirmation_email_artistId_key" RENAME TO "ProfileUserSubscriptionConfirmation_email_profileId_key";

-- RenameIndex
ALTER INDEX "TrackGroup_artistId_urlSlug_key" RENAME TO "TrackGroup_profileId_urlSlug_key";
