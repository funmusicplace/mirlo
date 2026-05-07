/**
 * Determines if a track is playable by a user based on:
 * - Preview status
 * - Track purchases
 * - TrackGroup/Album purchases
 * - Subscription status
 */
export const isTrackPlayable = (options: {
  isPreview?: boolean;
  trackGroupId?: number;
  trackId?: number;
  trackGroupPurchases?: Array<{ userId?: number; trackGroupId?: number }>;
  trackPurchases?: Array<{ userId?: number; trackId?: number }>;
  isUserSubscriber?: boolean;
}): boolean => {
  const {
    isPreview,
    trackGroupId,
    trackId,
    trackGroupPurchases,
    trackPurchases,
    isUserSubscriber,
  } = options;

  // Always playable if it's a preview
  if (isPreview) {
    return true;
  }

  // Check if user has track group purchase (applies to all tracks in group)
  if (
    trackGroupId &&
    trackGroupPurchases &&
    trackGroupPurchases.some((p) => p.trackGroupId === trackGroupId)
  ) {
    return true;
  }

  // Check if user has individual track purchase
  if (
    trackId &&
    trackPurchases &&
    trackPurchases.some((p) => p.trackId === trackId)
  ) {
    return true;
  }

  // Check subscription access
  if (isUserSubscriber) {
    return true;
  }

  return false;
};

/**
 * Simpler version for cases where purchases are nested in track object
 * (legacy pattern used in trackGroup serialization)
 */
export const isTrackPlayableNested = ({
  isPreview,
  trackGroupPurchases,
  trackPurchases,
  userId,
  isUserSubscriber,
}: {
  isPreview?: boolean;
  trackGroupPurchases?: Array<{ userId: number }>;
  trackPurchases?: Array<{ userId: number }>;
  userId?: number;
  isUserSubscriber?: boolean;
}): boolean => {
  // Always playable if it's a preview
  if (isPreview) {
    return true;
  }

  // Check if user has track group purchase
  if (userId && trackGroupPurchases?.some((p) => p.userId === userId)) {
    return true;
  }

  // Check if user has individual track purchase
  if (userId && trackPurchases?.some((p) => p.userId === userId)) {
    return true;
  }

  // Check subscription access
  if (isUserSubscriber) {
    return true;
  }

  return false;
};
