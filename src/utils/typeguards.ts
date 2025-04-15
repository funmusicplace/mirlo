import {
  Merch,
  MerchPurchase,
  Track,
  TrackGroup,
  UserTrackGroupPurchase,
  UserTrackPurchase,
} from "@mirlo/prisma/client";

type TrackGroupPurchaseWithTrackGroup = UserTrackGroupPurchase & {
  trackGroup: TrackGroup;
};

type TrackPurchaseWithTrack = UserTrackPurchase & {
  track: Track;
};

export function isTrackGroupPurchase(
  entity: unknown
): entity is TrackGroupPurchaseWithTrackGroup {
  if (!entity) {
    return false;
  }
  return (entity as TrackGroupPurchaseWithTrackGroup).trackGroup !== undefined;
}

export function isTrackPurchase(
  entity: unknown
): entity is TrackPurchaseWithTrack {
  if (!entity) {
    return false;
  }
  return (entity as TrackPurchaseWithTrack).track !== undefined;
}

type MerchPurchaseWithMerch = MerchPurchase & {
  merch: Merch;
};

export function isMerchPurchase(
  entity: unknown
): entity is MerchPurchaseWithMerch {
  if (!entity) {
    return false;
  }
  return (entity as MerchPurchaseWithMerch).merch !== undefined;
}

export function isTrackGroup(entity: unknown): entity is TrackGroup {
  if (!entity) {
    return false;
  }
  return (entity as TrackGroup).credits !== undefined;
}
