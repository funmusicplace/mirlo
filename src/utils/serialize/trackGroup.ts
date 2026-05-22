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
import { processSingleMerch } from "../merch";
import { finalArtistAvatarBucket, finalCoversBucket } from "../minio";
import { isTrackPlayableNested } from "../trackPlayability";

export const processSingleTrackGroup = (
  tg: TrackGroup & {
    cover?: TrackGroupCover | null;
    artist?: Partial<Artist> & {
      avatar?: ArtistAvatar | null;
      user?: { currency?: string | null };
    };
    merch?: (Merch & { images: MerchImage[] })[];
    tracks?: (Track & { userTrackPurchases?: { userId: number }[] })[];
    tags?: (TrackGroupTag & { tag?: { tag?: string } })[];
    downloadableContent?: {
      downloadableContent: Record<string, unknown>;
      downloadableContentId: string;
    }[];
    trackGroupPurchases?: { userId: number }[];
  },
  options?: { loggedInUserId?: number }
) => ({
  ...tg,
  currency: tg.artist?.user?.currency ?? "usd",
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
      fallbackCurrency: tg.artist?.user?.currency ?? undefined,
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
});
