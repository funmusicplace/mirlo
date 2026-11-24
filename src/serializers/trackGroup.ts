import {
  Image,
  Profile,
  Merch,
  MerchImage,
  Track,
  TrackGroup,
  TrackGroupTag,
} from "@mirlo/prisma/client";

import { addSizesToStoredImage } from "../utils/artist";
import { storedImageVariantUrl } from "../utils/images";
import { resolveFundraiserDescription } from "../utils/postContent";
import {
  ArtistLink,
  ReleaseArtistRow,
  ReleaseArtistsSource,
  resolveReleaseArtists,
  resolveTrackArtists,
  TrackArtistRow,
  serializeTrackGroupArtists,
} from "../utils/releaseArtists";
import { isTrackPlayableNested } from "../utils/trackPlayability";

import { serializeMerch } from "./merch";
import { serializeSingleTrackIntoCanimus, CanimusTrack } from "./track";
import {
  omitPrivateProfileFields,
  renameProfileIdToArtistId,
  Serialized,
} from "./utils";

type TrackGroupOwner = Partial<Profile> & {
  avatar?: Image | null;
  user?: { currency?: string | null } | null;
  [key: string]: unknown;
};

export interface LocalTrackGroup extends TrackGroup {
  trackGroupArtists: ReleaseArtistRow[];
  cover?: Image | null;
  artist?: Partial<Profile>;
  profile?: Partial<Profile>;
  tracks?: CanimusTrack[];
}

export type TrackGroupInput = TrackGroup & {
  trackGroupArtists: ReleaseArtistRow[];
  cover?: Image | null;
  artist?: TrackGroupOwner;
  profile: TrackGroupOwner & { name: string; urlSlug: string };
  paymentToUser?: { currency?: string | null } | null;
  merch?: (Merch & { images: MerchImage[] })[];
  tracks?: (Omit<Track, "metadata"> & {
    userTrackPurchases?: { userId: number }[];
    trackArtists?: TrackArtistRow[];
  })[];
  tags?: (TrackGroupTag & { tag?: { tag?: string } })[];
  downloadableContent?: {
    downloadableContent: Record<string, unknown>;
    downloadableContentId: string;
  }[];
  userTrackGroupPurchases?: { userId: number }[];
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
  options?: { loggedInUserId?: number; canEdit?: boolean }
): Serialized<T> & {
  currency: string;
  totalTracks?: number;
  hasNotifiedFollowers: boolean;
  isIncludedInSubscription: boolean;
  isSubscriberExclusive: boolean;
  subscriptionArtist?: SubscriptionArtist;
  tags: string[];
  releaseArtists: ArtistLink[];
  releaseArtistsSource: ReleaseArtistsSource;
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
  const { releaseArtists, releaseArtistsSource } = resolveReleaseArtists(
    tg.trackGroupArtists,
    owner
  );

  return {
    ...rest,
    artistId: profileId ?? owner?.id,
    trackGroupArtists: serializeTrackGroupArtists(tg.trackGroupArtists),
    artist: owner
      ? {
          ...omitPrivateProfileFields(owner),
          avatar: owner.avatar
            ? renameProfileIdToArtistId(addSizesToStoredImage(owner.avatar))
            : undefined,
        }
      : undefined,
    releaseArtists,
    releaseArtistsSource,
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
      ...(track.trackArtists
        ? resolveTrackArtists(track.trackArtists, releaseArtists)
        : {}),
      isPlayable:
        !!options?.canEdit ||
        (!!options?.loggedInUserId &&
          owner?.userId === options.loggedInUserId) ||
        ((track.isPreview || !tg.isPreorder) &&
          isTrackPlayableNested({
            isPreview: track.isPreview,
            trackGroupPurchases: tg.userTrackGroupPurchases,
            trackPurchases: track.userTrackPurchases,
            userId: options?.loggedInUserId,
          })),
    })),
    merch: tg.merch?.map((m) =>
      serializeMerch(m, {
        fallbackCurrency: currency,
      })
    ),
    tags: tg.tags?.map((t) => t.tag?.tag) ?? [],
    ...("fundraiser" in tg && tg.fundraiser
      ? {
          fundraiser: resolveFundraiserDescription(
            tg.fundraiser as { description?: string | null }
          ),
        }
      : {}),
    cover: addSizesToStoredImage(tg.cover),
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
    releaseArtists: ArtistLink[];
    releaseArtistsSource: ReleaseArtistsSource;
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

export const canimusFeedLink = (path: string) => ({
  name: "Canimus feed",
  href: new URL(path, String(process.env.API_DOMAIN)).href,
  type: "application/canimus+json",
  rel: "alternate",
});

export const canimusReleaseUrl = (
  artistUrl: string,
  trackGroup: { urlSlug: string }
) => `${artistUrl}/release/${trackGroup.urlSlug}`;

export const serializeSingleTrackGroupIntoCanimus = (
  trackGroup: LocalTrackGroup,
  artistUrl: string,
  artistName: string,
  canBePurchased: boolean,
  instanceName: string
) => {
  const releaseUrl = canimusReleaseUrl(artistUrl, trackGroup);
  const coverUrl = storedImageVariantUrl(trackGroup.cover, 600);
  const links = [
    canimusFeedLink(`v1/trackGroups/${trackGroup.id}/canimus.json`),
  ];
  if (canBePurchased) {
    // TODO: replace with a standalone buy page once that exists
    const purchaseUrl = `${releaseUrl}?buy=true`;
    links.push({
      name: `Buy ${trackGroup.title} on ${instanceName}`,
      href: purchaseUrl,
      type: "Purchase",
      rel: "purchase",
    });
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
      cover: coverUrl
        ? {
            src: coverUrl,
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
  trackGroup: Pick<LocalTrackGroup, "id" | "title" | "urlSlug">,
  artistUrl: string
) => {
  return {
    type: "album",
    name: trackGroup.title,
    url: canimusReleaseUrl(artistUrl, trackGroup),
    uid: String(trackGroup.id),
  };
};
