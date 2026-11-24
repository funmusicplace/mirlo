import { Track, TrackAudio, TrackArtist } from "@mirlo/prisma/client";

import {
  ArtistLink,
  MainArtistsSource,
  resolveTrackArtists,
} from "../utils/releaseArtists";
import { isTrackPlayableNested } from "../utils/trackPlayability";

import { processSingleTrackGroup, TrackGroupInput } from "./trackGroup";
import { Serialized } from "./utils";

type TrackInput = Track & {
  trackGroup: TrackGroupInput;
  trackArtists?: TrackArtist[];
  audio?: TrackAudio | null;
  userTrackPurchases?: { userId: number }[];
};

export const processSingleTrack = <T extends TrackInput>(
  track: T,
  options?: { loggedInUserId?: number }
) => {
  const trackGroup = processSingleTrackGroup(track.trackGroup, {
    loggedInUserId: options?.loggedInUserId,
  });
  return {
    ...track,
    ...(track.trackArtists
      ? resolveTrackArtists(track.trackArtists, trackGroup.releaseArtists)
      : {}),
    isPlayable: isTrackPlayableNested({
      isPreview: track.isPreview,
      trackGroupPurchases: track.trackGroup.userTrackGroupPurchases,
      trackPurchases: track.userTrackPurchases,
      userId: options?.loggedInUserId,
    }),
    trackGroup,
  } as Serialized<T> & {
    isPlayable: boolean;
    mainArtists?: ArtistLink[];
    featuredArtists?: ArtistLink[];
    mainArtistsSource?: MainArtistsSource;
  };
};

export interface CanimusTrack extends Track {
  audio?: { duration: number | null } | null;
}

export const serializeSingleTrackIntoCanimus = (
  track: CanimusTrack,
  releaseUrl: string
) => {
  const trackId = String(track.id);
  const metadata: any = track.metadata;
  const mediaUrl = new URL(
    `v1/tracks/${trackId}/stream/external/playlist.m3u8`,
    String(process.env.API_DOMAIN)
  ).href;
  return {
    type: "track",
    name: track.title,
    url: `${releaseUrl}/tracks/${trackId}`,
    id: trackId,
    duration: track.audio?.duration ?? metadata?.format?.duration,
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
