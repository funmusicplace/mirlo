import { join } from "path";

import {
  Profile,
  ProfileAvatar,
  Track,
  TrackAudio,
  TrackArtist,
  TrackGroup,
  TrackGroupCover,
} from "@mirlo/prisma/client";

import { isTrackPlayableNested } from "../utils/trackPlayability";

import { processSingleTrackGroup } from "./trackGroup";
import { Serialized } from "./utils";

type TrackInput = Track & {
  trackGroup?: TrackGroup & {
    profile?: Partial<Profile> & { avatar?: ProfileAvatar | null };
    artist?: Partial<Profile> & { avatar?: ProfileAvatar | null };
    cover?: TrackGroupCover | null;
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

export const serializeSingleTrackIntoCanimus = (
  track: CanimusTrack,
  releaseUrl: string
) => {
  const trackId = String(track.id);
  const metadata: any = track.metadata;
  const mediaUrl = join(
    String(process.env.API_DOMAIN),
    "v1/tracks",
    trackId,
    "stream/external/playlist.m3u8"
  );
  return {
    type: "track",
    name: track.title,
    url: join(releaseUrl, "tracks", trackId),
    duration: track.audio?.duration ?? metadata?.format?.duration,
    track: track.order,
    updated_date: track.updatedAt?.toISOString().split("T")[0],
    media: [
      {
        src: mediaUrl,
        type: "audio/x-mpegurl",
      },
    ],
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
    url: join(releaseUrl, "tracks", trackId),
  };
};
