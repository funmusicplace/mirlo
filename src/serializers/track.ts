import {
  Image,
  Profile,
  Track,
  TrackAudio,
  TrackArtist,
  TrackGroup,
} from "@mirlo/prisma/client";

import { isTrackPlayableNested } from "../utils/trackPlayability";

import { processSingleTrackGroup } from "./trackGroup";
import { Serialized } from "./utils";

type TrackInput = Track & {
  trackGroup?: TrackGroup & {
    profile?: Partial<Profile> & { avatar?: Image | null };
    artist?: Partial<Profile> & { avatar?: Image | null };
    cover?: Image | null;
    userTrackGroupPurchases?: { userId: number }[];
  };
  trackArtists?: TrackArtist[];
  audio?: TrackAudio | null;
  userTrackPurchases?: { userId: number }[];
};

export const processSingleTrack = <T extends TrackInput>(
  track: T,
  options?: { loggedInUserId?: number }
): Serialized<T> & { isPlayable: boolean } =>
  ({
    ...track,
    isPlayable: isTrackPlayableNested({
      isPreview: track.isPreview,
      trackGroupPurchases: track.trackGroup?.userTrackGroupPurchases,
      trackPurchases: track.userTrackPurchases,
      userId: options?.loggedInUserId,
    }),
    trackGroup: track.trackGroup
      ? processSingleTrackGroup(
          track.trackGroup as Parameters<typeof processSingleTrackGroup>[0],
          {
            loggedInUserId: options?.loggedInUserId,
          }
        )
      : undefined,
  }) as Serialized<T> & { isPlayable: boolean };

export interface CanimusTrack extends Track {
  audio?: { duration: number | null } | null;
}

export const trackDuration = (track: {
  audio?: { duration: number | null } | null;
  metadata?: unknown;
}) =>
  track.audio?.duration ??
  (track.metadata as { format?: { duration?: number } } | null)?.format
    ?.duration;

export const serializeSingleTrackIntoCanimus = (
  track: CanimusTrack,
  releaseUrl: string
) => {
  const trackId = String(track.id);
  const mediaUrl = new URL(
    `v1/tracks/${trackId}/stream/external/playlist.m3u8`,
    String(process.env.API_DOMAIN)
  ).href;
  return {
    type: "track",
    name: track.title,
    url: `${releaseUrl}/tracks/${trackId}`,
    id: trackId,
    duration: trackDuration(track),
    track: track.order,
    updated_date: track.updatedAt?.toISOString().split("T")[0],
    media: track.isPreview
      ? [
          {
            src: mediaUrl,
            type: "audio/x-mpegurl",
          },
        ]
      : null,
  };
};

export const serializeSingleDeletedTrackIntoCanimus = (
  track: Track,
  releaseUrl: string
) => {
  const trackId = String(track.id);
  return {
    type: "track",
    name: track.title,
    url: `${releaseUrl}/tracks/${trackId}`,
    id: trackId,
  };
};
