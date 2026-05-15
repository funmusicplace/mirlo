import {
  Artist,
  ArtistAvatar,
  ArtistBackground,
  ArtistSubscriptionTier,
  Image,
  Merch,
  MerchImage,
  Post,
  Track,
  TrackGroup,
  TrackGroupCover,
} from "@mirlo/prisma/client";

import { addSizesToImage } from "../artist";
import { processSingleMerch } from "../merch";
import {
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
  finalCoversBucket,
  finalImageBucket,
} from "../minio";

import { serializePost } from "./post";
import { processSingleTrackGroup } from "./trackGroup";

interface LocalArtist extends Artist {
  posts?: Post[];
  background?: ArtistBackground | null;
  avatar?: ArtistAvatar | null;
  trackGroups?: (TrackGroup & {
    cover?: TrackGroupCover | null;
    tracks?: Track[];
  })[];
  merch?: (Merch & { images?: MerchImage[] })[];
  subscriptionTiers?: (ArtistSubscriptionTier & {
    images?: { image: Image }[];
    releases?: { trackGroup: { cover?: TrackGroupCover | null } }[];
  })[];
  user?: {
    artistLabels?: {
      artist: Artist & {
        avatar?: ArtistAvatar | null;
        background?: ArtistBackground | null;
        trackGroups?: (TrackGroup & {
          cover?: TrackGroupCover | null;
          tracks?: Track[];
        })[];
      };
    }[];
    [key: string]: unknown;
  } | null;
}

export const processSingleArtist = (
  artist: LocalArtist,
  userId?: number,
  isUserSubscriber?: boolean
) => {
  return {
    ...artist,
    posts: artist?.posts?.map((p: Post) =>
      serializePost(
        p,
        undefined,
        undefined,
        isUserSubscriber || artist.userId === userId
      )
    ),
    merch: artist?.merch?.map(processSingleMerch),
    background: addSizesToImage(
      finalArtistBackgroundBucket,
      artist?.background
    ),
    avatar: addSizesToImage(finalArtistAvatarBucket, artist?.avatar),
    trackGroups: artist?.trackGroups?.map((tg) =>
      processSingleTrackGroup(tg, { loggedInUserId: userId })
    ),
    subscriptionTiers: artist.subscriptionTiers?.map((tier) => ({
      ...tier,
      images: tier.images?.map((img) => ({
        ...img,
        image: addSizesToImage(finalImageBucket, img.image),
      })),
      releases: tier.releases?.map((rel) => ({
        ...rel,
        trackGroup: {
          ...rel.trackGroup,
          cover: addSizesToImage(finalCoversBucket, rel.trackGroup.cover),
        },
      })),
    })),
    user: artist.user
      ? {
          ...artist.user,
          artistLabels: artist.user.artistLabels?.map((al) => ({
            ...al,
            artist: {
              ...al.artist,
              avatar: addSizesToImage(
                finalArtistAvatarBucket,
                al.artist?.avatar
              ),
              background: addSizesToImage(
                finalArtistBackgroundBucket,
                al.artist?.background
              ),
              trackGroups: al.artist?.trackGroups?.map((tg) =>
                processSingleTrackGroup(tg, { loggedInUserId: userId })
              ),
            },
          })),
        }
      : artist.user,
  };
};
