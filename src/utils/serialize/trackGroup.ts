import { join } from "path";

import {
  Artist,
  ArtistAvatar,
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
  tracks?: CanimusTrack[];
}

export const processSingleTrackGroup = (
  tg: TrackGroup & {
    cover?: TrackGroupCover | null;
    artist?: Partial<Artist> & {
      avatar?: ArtistAvatar | null;
      user?: { currency?: string | null };
    };
    paymentToUser?: { currency?: string | null } | null;
    merch?: (Merch & { images: MerchImage[] })[];
    tracks?: (Track & { userTrackPurchases?: { userId: number }[] })[];
    tags?: (TrackGroupTag & { tag?: { tag?: string } })[];
    downloadableContent?: {
      downloadableContent: Record<string, unknown>;
      downloadableContentId: string;
    }[];
    trackGroupPurchases?: { userId: number }[];
    _count?: { tracks?: number; userTrackGroupPurchases?: number };
  },
  options?: { loggedInUserId?: number }
) => {
  const { _count, ...rest } = tg;
  const currency =
    tg.paymentToUser?.currency ?? tg.artist?.user?.currency ?? "usd";
  return {
    ...rest,
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
    artist: tg.artist
      ? {
          ...tg.artist,
          avatar: tg.artist.avatar
            ? addSizesToImage(finalArtistAvatarBucket, tg.artist.avatar)
            : undefined,
        }
      : undefined,
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
  artistUrl: string,
  artistName: string
) => {
  const releaseUrl = join(artistUrl, "release", trackGroup.urlSlug);
  const coverString = trackGroup.cover?.url.find((u) => u.includes("x600"));

  return {
    type: "album",
    name: trackGroup.title,
    url: releaseUrl,
    release_date: trackGroup.releaseDate,
    license: trackGroup.credits,
    artist: artistName,
    images: {
      cover: coverString
        ? {
            src: generateFullStaticImageUrl(coverString, finalCoversBucket),
            width: 600,
            height: 600,
          }
        : undefined,
    },
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
