import {
  Artist,
  Merch,
  MerchPurchase,
  Post,
  Track,
  TrackGroup,
  UserTrackGroupPurchase,
  UserTrackPurchase,
  UserTransaction,
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

export function isUserTransaction(entity: unknown): entity is UserTransaction {
  if (!entity) {
    return false;
  }
  return (entity as UserTransaction).platformCut !== undefined;
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

export function isPost(entity: unknown): entity is Post {
  if (!entity) {
    return false;
  }
  return (entity as Post).content !== undefined;
}

export function isArtist(entity: unknown): entity is Artist {
  if (!entity) {
    return false;
  }
  return (entity as Artist).bio !== undefined;
}
