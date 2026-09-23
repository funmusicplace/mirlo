import { join } from "path";

import {
  Profile,
  ProfileAvatar,
  Merch,
  MerchImage,
  Track,
  TrackGroup,
  TrackGroupCover,
  TrackGroupTag,
} from "@mirlo/prisma/client";

import { addSizesToImage } from "../utils/artist";
import { generateFullStaticImageUrl } from "../utils/images";
import { finalArtistAvatarBucket, finalCoversBucket } from "../utils/minio";
import { isTrackPlayableNested } from "../utils/trackPlayability";

import { serializeMerch } from "./merch";
import { serializeSingleTrackIntoCanimus, CanimusTrack } from "./track";
import {
  omitApPrivateKey,
  renameProfileIdToArtistId,
  Serialized,
} from "./utils";

type TrackGroupOwner = Partial<Profile> & {
  avatar?: ProfileAvatar | null;
  user?: { currency?: string | null } | null;
  [key: string]: unknown;
};

export interface LocalTrackGroup extends TrackGroup {
  cover?: TrackGroupCover | null;
  artist?: Partial<Profile>;
  profile?: Partial<Profile>;
  tracks?: CanimusTrack[];
}

type TrackGroupInput = TrackGroup & {
  cover?: TrackGroupCover | null;
  artist?: TrackGroupOwner;
  profile?: TrackGroupOwner;
  paymentToUser?: { currency?: string | null } | null;
  merch?: (Merch & { images: MerchImage[] })[];
  tracks?: (Omit<Track, "metadata"> & {
    userTrackPurchases?: { userId: number }[];
  })[];
  tags?: (TrackGroupTag & { tag?: { tag?: string } })[];
  downloadableContent?: {
    downloadableContent: Record<string, unknown>;
    downloadableContentId: string;
  }[];
  trackGroupPurchases?: { userId: number }[];
  _count?: {
    tracks?: number;
    userTrackGroupPurchases?: number;
    subscriptionTierReleases?: number;
  };
  subscriptionTierReleases?: { tier: { profile: SubscriptionArtist } }[];
};

type SubscriptionArtist = { id: number; urlSlug: string | null; name: string };

export const isIncludedInSubscription = (trackGroup: {
  _count?: { subscriptionTierReleases?: number };
}) => (trackGroup._count?.subscriptionTierReleases ?? 0) > 0;

export const isSubscriberExclusive = (trackGroup: {
  isGettable?: boolean;
  _count?: { subscriptionTierReleases?: number };
}) => trackGroup.isGettable === false && isIncludedInSubscription(trackGroup);

const findSubscriptionArtist = (
  ownerId: number | undefined,
  releases?: { tier: { profile: SubscriptionArtist } }[]
): SubscriptionArtist | undefined => {
  const profiles = releases?.map((release) => release.tier.profile) ?? [];
  return profiles.find((profile) => profile.id === ownerId) ?? profiles[0];
};

export const processSingleTrackGroup = <T extends TrackGroupInput>(
  tg: T,
  options?: { loggedInUserId?: number }
): Serialized<T> & {
  currency: string;
  totalTracks?: number;
  hasNotifiedFollowers: boolean;
  isIncludedInSubscription: boolean;
  isSubscriberExclusive: boolean;
  subscriptionArtist?: SubscriptionArtist;
  tags: string[];
} => {
  const {
    _count,
    profile,
    profileId,
    artist,
    subscriptionTierReleases,
    ...rest
  } = tg;
  const owner = profile ?? artist;
  const currency = tg.paymentToUser?.currency ?? owner?.user?.currency ?? "usd";

  return {
    ...rest,
    artistId: profileId ?? owner?.id,
    artist: owner
      ? {
          ...omitApPrivateKey(owner),
          avatar: owner.avatar
            ? renameProfileIdToArtistId(
                addSizesToImage(finalArtistAvatarBucket, owner.avatar)
              )
            : undefined,
        }
      : undefined,
    totalTracks: _count?.tracks ?? tg.tracks?.length,
    currency,
    hasNotifiedFollowers: tg.notifiedFollowersAt !== null,
    isIncludedInSubscription: isIncludedInSubscription(tg),
    isSubscriberExclusive: isSubscriberExclusive(tg),
    subscriptionArtist: findSubscriptionArtist(
      profileId ?? owner?.id,
      subscriptionTierReleases
    ),
    tracks: tg.tracks?.map((track) => ({
      ...track,
      isPlayable: isTrackPlayableNested({
        isPreview: track.isPreview,
        trackGroupPurchases: tg.trackGroupPurchases,
        trackPurchases: track.userTrackPurchases,
        userId: options?.loggedInUserId,
      }),
    })),
    merch: tg.merch?.map((m) =>
      serializeMerch(m, {
        fallbackCurrency: currency,
      })
    ),
    tags: tg.tags?.map((t) => t.tag?.tag) ?? [],
    cover: addSizesToImage(finalCoversBucket, tg.cover),
    downloadableContent: tg.downloadableContent?.map((dc) => ({
      ...dc,
      downloadableContent: {
        ...dc.downloadableContent,
        downloadUrl:
          process.env.API_DOMAIN +
          `/v1/downloadableContent/${dc.downloadableContentId}`,
      },
    })),
  } as Serialized<T> & {
    currency: string;
    totalTracks?: number;
    hasNotifiedFollowers: boolean;
    isIncludedInSubscription: boolean;
    isSubscriberExclusive: boolean;
    subscriptionArtist?: SubscriptionArtist;
    tags: string[];
  };
};

export const serializeTrackGroupPurchase = <
  T extends { trackGroup?: TrackGroupInput | null },
>(
  purchase: T,
  options?: { loggedInUserId?: number }
): Serialized<T> => {
  const { trackGroup, ...rest } = purchase;
  return {
    ...rest,
    trackGroup: trackGroup
      ? processSingleTrackGroup(trackGroup, options)
      : trackGroup,
  } as Serialized<T>;
};

export const serializeSingleTrackGroupIntoCanimus = (
  trackGroup: LocalTrackGroup,
  artistUrl: string,
  artistName: string,
  canBePurchased: boolean
) => {
  const releaseUrl = `${artistUrl}/release/${trackGroup.urlSlug}`;
  const coverString = trackGroup.cover?.url.find((u) => u.includes("x600"));
  let links;
  if (canBePurchased) {
    // TODO: replace with a standalone buy page once that exists
    const purchaseUrl = `${releaseUrl}?buy=true`;
    links = [
      {
        name: `Buy ${trackGroup.title} on Mirlo`,
        href: purchaseUrl,
        type: "Purchase",
        rel: "purchase",
      },
    ];
  }

  return {
    type: "album",
    name: trackGroup.title,
    url: releaseUrl,
    uid: String(trackGroup.id),
    release_date: trackGroup.releaseDate?.toISOString().split("T")[0],
    updated_date: trackGroup.updatedAt?.toISOString().split("T")[0],
    license: trackGroup.credits,
    artist: artistName,
    images: {
      cover: coverString
        ? {
            src: generateFullStaticImageUrl(coverString, finalCoversBucket),
            alt: trackGroup.coverImageAlt,
            width: 600,
            height: 600,
          }
        : undefined,
    },
    links,
    description: trackGroup.about,
    children: trackGroup.tracks?.map((track: CanimusTrack) =>
      serializeSingleTrackIntoCanimus(track, releaseUrl)
    ),
  };
};

export const serializeSingleDeletedTrackGroupIntoCanimus = (
  trackGroup: LocalTrackGroup,
  artistUrl: string
) => {
  const releaseUrl = join(artistUrl, "release", trackGroup.urlSlug);
  return {
    type: "album",
    name: trackGroup.title,
    url: releaseUrl,
  };
};
