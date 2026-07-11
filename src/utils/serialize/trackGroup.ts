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

import { addSizesToImage } from "../artist";
import { generateFullStaticImageUrl } from "../images";
import { processSingleMerch } from "../merch";
import { finalArtistAvatarBucket, finalCoversBucket } from "../minio";
import { isTrackPlayableNested } from "../trackPlayability";

import { serializeSingleTrackIntoCanimus, CanimusTrack } from "./track";

export interface LocalTrackGroup extends TrackGroup {
  cover?: TrackGroupCover | null;
  artist?: Partial<Profile>;
  profile?: Partial<Profile>;
  tracks?: CanimusTrack[];
}

export const processSingleTrackGroup = (
  tg: TrackGroup & {
    cover?: TrackGroupCover | null;
    artist?: Partial<Profile> & {
      avatar?: ProfileAvatar | null;
      user?: { currency?: string | null } | null;
    };
    profile?: Partial<Profile> & {
      avatar?: ProfileAvatar | null;
      user?: { currency?: string | null } | null;
    };
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
    _count?: { tracks?: number; userTrackGroupPurchases?: number };
  },
  options?: { loggedInUserId?: number }
): Record<string, unknown> => {
  const { _count, profileId, profile, ...rest } = tg;
  const { apPrivateKey: _, ...profilePublic } = profile ?? {};
  const currency =
    tg.paymentToUser?.currency ?? profile?.user?.currency ?? "usd";
  const artist = profile
    ? {
        ...profilePublic,
        avatar: profile.avatar
          ? addSizesToImage(finalArtistAvatarBucket, profile.avatar)
          : undefined,
      }
    : undefined;

  return {
    ...rest,
    artistId: profileId,
    artist,
    totalTracks: _count?.tracks ?? tg.tracks?.length,
    currency,
    hasNotifiedFollowers: tg.notifiedFollowersAt !== null,
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
      processSingleMerch(m, {
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
  };
};

export const serializeSingleTrackGroupIntoCanimus = (
  trackGroup: LocalTrackGroup,
  profileUrl: string,
  artistName: string,
  canBePurchased: boolean
) => {
  const releaseUrl = `${profileUrl}/release/${trackGroup.urlSlug}`;
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
  profileUrl: string
) => {
  const releaseUrl = join(profileUrl, "release", trackGroup.urlSlug);
  return {
    type: "album",
    name: trackGroup.title,
    url: releaseUrl,
  };
};
