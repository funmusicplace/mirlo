import { join } from "path";

import {
  Artist,
  ArtistAvatar,
  Track,
  TrackAudio,
  TrackArtist,
  TrackGroup,
  TrackGroupCover,
} from "@mirlo/prisma/client";

import { isTrackPlayableNested } from "../trackPlayability";

import { processSingleTrackGroup } from "./trackGroup";

const path = require("path");

export const processSingleTrack = (
  track: Track & {
    trackGroup?: TrackGroup & {
      artist?: Partial<Artist> & { avatar?: ArtistAvatar | null };
      cover?: TrackGroupCover | null;
      userTrackGroupPurchases?: { userId: number }[];
    };
    trackArtists?: TrackArtist[];
    audio?: TrackAudio | null;
    userTrackPurchases?: { userId: number }[];
  },
  options?: { loggedInUserId?: number }
) => ({
  ...track,
  isPlayable: isTrackPlayableNested({
    isPreview: track.isPreview,
    trackGroupPurchases: track.trackGroup?.userTrackGroupPurchases,
    trackPurchases: track.userTrackPurchases,
    userId: options?.loggedInUserId,
  }),
  trackGroup: track.trackGroup
    ? processSingleTrackGroup(track.trackGroup, {
        loggedInUserId: options?.loggedInUserId,
      })
    : undefined,
});

export const serializeSingleTrackIntoCanimus = (
  track: Track,
  releaseUrl: string
) => {
  const trackUrl = join(releaseUrl, "tracks", String(track.id));
  const metadata: any = track.metadata;
  return {
    type: "track",
    name: track.title,
    url: trackUrl,
    duration: metadata.format.duration,
    media: [
      {
        src: `${process.env.API_DOMAIN}/v1/tracks/${track.id}/stream/playlist.m3u8`,
        type: "audio/x-mpegurl",
      },
    ],
  };
};
