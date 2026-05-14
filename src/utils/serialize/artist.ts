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

interface LocalTrackGroup extends TrackGroup {
  cover?: TrackGroupCover | null;
  tracks?: Track[];
}

interface LocalArtist extends Artist {
  posts?: Post[];
  background?: ArtistBackground | null;
  avatar?: ArtistAvatar | null;
  trackGroups?: LocalTrackGroup[] | null;
  merch?: (Merch & { images?: MerchImage[] })[];
  subscriptionTiers?: (ArtistSubscriptionTier & {
    images?: { image: Image }[];
    releases?: { trackGroup: { cover?: TrackGroupCover | null } }[];
  })[];
  user?: {
    currency?: string | null;
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
    merch: artist?.merch?.map((m) =>
      processSingleMerch(m, {
        fallbackCurrency: artist?.user?.currency ?? undefined,
      })
    ),
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

export const serializeSingleArtistIntoCanimus = (artist: LocalArtist) => {
  const artistUrl = `https://mirlo.space/${artist.urlSlug}`;
  return {
    type: "artist",
    name: artist.name,
    url: artistUrl,
    images: {
      main: {
        src: `https://cdn.mirlo.space/file/artist-avatars/${artist.avatar?.url[0]}.webp`,
        alt: null,
      },
    },
    summary: artist.shortDescription,
    description: artist.bio,
    links: Object.assign(
      {},
      ...artist.linksJson.map((link: any) => ({
        name: link.linkLabel,
        href: link.url,
        type: link.linkType,
      }))
    ),
    children: artist.trackGroups?.map((trackGroup: TrackGroup) =>
      serializeSingleTrackGroupIntoCanimus(trackGroup, artistUrl)
    ),
  };
};

export const serializeSingleTrackGroupIntoCanimus = (
  trackGroup: LocalTrackGroup,
  artistUrl: string
) => {
  const releaseUrl = `${artistUrl}/release/${trackGroup.urlSlug}`;
  return {
    type: "album",
    name: trackGroup.title,
    url: releaseUrl,
    release_date: trackGroup.releaseDate,
    license: trackGroup.credits,
    artist: trackGroup.artistId,
    images: {
      cover: {
        src: `https://cdn.mirlo.space/file/trackgroup-covers/${trackGroup.cover?.url[0]}.webp`,
      },
    },
    description: trackGroup.about,
    children: trackGroup.tracks?.map((track: Track) =>
      serializeSingleTrackIntoCanimus(track, releaseUrl)
    ),
  };
};

export const serializeSingleTrackIntoCanimus = (
  track: Track,
  releaseUrl: string
) => {
  const trackUrl = `${releaseUrl}/tracks/${track.id}`;
  const metadata: any = track.metadata;
  return {
    type: "track",
    name: track.title,
    url: trackUrl,
    duration: metadata.format.duration,
    media: [
      {
        src: `https://mirlo.space/v1/tracks/${track.id}/stream/playlist.m3u8`,
        type: "audio/x-mpegurl",
      },
    ],
  };
};
