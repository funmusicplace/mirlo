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
