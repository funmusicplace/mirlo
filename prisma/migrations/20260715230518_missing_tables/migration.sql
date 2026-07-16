-- AlterTable
ALTER TABLE "Profile" RENAME CONSTRAINT "Artist_pkey" TO "Profile_pkey";

-- AlterTable
ALTER TABLE "ProfileAvatar" RENAME CONSTRAINT "ArtistAvatar_pkey" TO "ProfileAvatar_pkey";

-- AlterTable
ALTER TABLE "ProfileBackground" RENAME CONSTRAINT "ArtistBackground_pkey" TO "ProfileBackground_pkey";

-- AlterTable
ALTER TABLE "ProfileSubscriptionTier" RENAME CONSTRAINT "ArtistSubscriptionTier_pkey" TO "ProfileSubscriptionTier_pkey";

-- AlterTable
ALTER TABLE "ProfileTipTier" RENAME CONSTRAINT "ArtistTipTier_pkey" TO "ProfileTipTier_pkey";

-- AlterTable
ALTER TABLE "ProfileUserSubscription" RENAME CONSTRAINT "ArtistUserSubscription_pkey" TO "ProfileUserSubscription_pkey";

-- AlterTable
ALTER TABLE "ProfileUserSubscriptionCharge" RENAME CONSTRAINT "ArtistUserSubscriptionCharge_pkey" TO "ProfileUserSubscriptionCharge_pkey";

-- AlterTable
ALTER TABLE "ProfileUserSubscriptionConfirmation" RENAME CONSTRAINT "ArtistUserSubscriptionConfirmation_pkey" TO "ProfileUserSubscriptionConfirmation_pkey";

-- AlterTable
ALTER TABLE "UserProfileTip" RENAME CONSTRAINT "UserArtistTip_pkey" TO "UserProfileTip_pkey";

-- RenameForeignKey
ALTER TABLE "ActivityPubProfileFollowers" RENAME CONSTRAINT "ActivityPubArtistFollowers_artistId_fkey" TO "ActivityPubProfileFollowers_artistId_fkey";

-- RenameForeignKey
ALTER TABLE "Profile" RENAME CONSTRAINT "Artist_paymentToUserId_fkey" TO "Profile_paymentToUserId_fkey";

-- RenameForeignKey
ALTER TABLE "Profile" RENAME CONSTRAINT "Artist_userId_fkey" TO "Profile_userId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileAvatar" RENAME CONSTRAINT "ArtistAvatar_artistId_fkey" TO "ProfileAvatar_artistId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileBackground" RENAME CONSTRAINT "ArtistBackground_artistId_fkey" TO "ProfileBackground_artistId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileLocationTag" RENAME CONSTRAINT "ArtistLocationTag_artistId_fkey" TO "ProfileLocationTag_artistId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileLocationTag" RENAME CONSTRAINT "ArtistLocationTag_locationTagId_fkey" TO "ProfileLocationTag_locationTagId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileSubscriptionTier" RENAME CONSTRAINT "ArtistSubscriptionTier_artistId_fkey" TO "ProfileSubscriptionTier_artistId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileTipTier" RENAME CONSTRAINT "ArtistTipTier_artistId_fkey" TO "ProfileTipTier_artistId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileUserSubscription" RENAME CONSTRAINT "ArtistUserSubscription_artistSubscriptionTierId_fkey" TO "ProfileUserSubscription_artistSubscriptionTierId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileUserSubscription" RENAME CONSTRAINT "ArtistUserSubscription_userId_fkey" TO "ProfileUserSubscription_userId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileUserSubscriptionCharge" RENAME CONSTRAINT "ArtistUserSubscriptionCharge_artistUserSubscriptionId_fkey" TO "ProfileUserSubscriptionCharge_artistUserSubscriptionId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileUserSubscriptionCharge" RENAME CONSTRAINT "ArtistUserSubscriptionCharge_transactionId_fkey" TO "ProfileUserSubscriptionCharge_transactionId_fkey";

-- RenameForeignKey
ALTER TABLE "ProfileUserSubscriptionConfirmation" RENAME CONSTRAINT "ArtistUserSubscriptionConfirmation_artistId_fkey" TO "ProfileUserSubscriptionConfirmation_artistId_fkey";

-- RenameForeignKey
ALTER TABLE "UserProfileNotificationSetting" RENAME CONSTRAINT "UserArtistNotificationSetting_artistId_fkey" TO "UserProfileNotificationSetting_artistId_fkey";

-- RenameForeignKey
ALTER TABLE "UserProfileNotificationSetting" RENAME CONSTRAINT "UserArtistNotificationSetting_userId_fkey" TO "UserProfileNotificationSetting_userId_fkey";

-- RenameForeignKey
ALTER TABLE "UserProfileTip" RENAME CONSTRAINT "UserArtistTip_artistId_fkey" TO "UserProfileTip_artistId_fkey";

-- RenameForeignKey
ALTER TABLE "UserProfileTip" RENAME CONSTRAINT "UserArtistTip_artistTipTierId_fkey" TO "UserProfileTip_artistTipTierId_fkey";

-- RenameForeignKey
ALTER TABLE "UserProfileTip" RENAME CONSTRAINT "UserArtistTip_transactionId_fkey" TO "UserProfileTip_transactionId_fkey";

-- RenameForeignKey
ALTER TABLE "UserProfileTip" RENAME CONSTRAINT "UserArtistTip_userId_fkey" TO "UserProfileTip_userId_fkey";

-- RenameIndex
ALTER INDEX "ActivityPubArtistFollowers_actor_artistId_key" RENAME TO "ActivityPubProfileFollowers_actor_artistId_key";

-- RenameIndex
ALTER INDEX "ArtistAvatar_artistId_key" RENAME TO "ProfileAvatar_artistId_key";

-- RenameIndex
ALTER INDEX "ArtistBackground_artistId_key" RENAME TO "ProfileBackground_artistId_key";

-- RenameIndex
ALTER INDEX "ArtistLocationTag_artistId_locationTagId_key" RENAME TO "ProfileLocationTag_artistId_locationTagId_key";

-- RenameIndex
ALTER INDEX "ArtistUserSubscription_userId_artistSubscriptionTierId_key" RENAME TO "ProfileUserSubscription_userId_artistSubscriptionTierId_key";

-- RenameIndex
ALTER INDEX "ArtistUserSubscriptionConfirmation_email_artistId_key" RENAME TO "ProfileUserSubscriptionConfirmation_email_artistId_key";

-- RenameIndex
ALTER INDEX "UserArtistNotificationSetting_userId_notification_key" RENAME TO "UserProfileNotificationSetting_userId_notification_key";
