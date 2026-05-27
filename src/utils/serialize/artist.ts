import { join } from "path";

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
import { generateFullStaticImageUrl } from "../images";
import { processSingleMerch } from "../merch";
import {
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
  finalCoversBucket,
  finalImageBucket,
} from "../minio";

import { serializePost } from "./post";
import {
  processSingleTrackGroup,
  serializeSingleTrackGroupIntoCanimus,
  serializeSingleDeletedTrackGroupIntoCanimus,
  LocalTrackGroup,
} from "./trackGroup";

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
  const artistUrl = join(String(process.env.API_DOMAIN), artist.urlSlug);
  const avatarString = artist.avatar?.url.find((u) => u.includes("x600"));

  return {
    type: "artist",
    name: artist.name,
    url: artistUrl,
    images: {
      cover: {
        src: avatarString
          ? generateFullStaticImageUrl(avatarString, finalArtistAvatarBucket)
          : undefined,
        alt: null,
        width: 600,
        height: 600,
      },
    },
    summary: artist.shortDescription,
    description: artist.bio,
    links: artist.linksJson.map((link: any) => ({
      name: link.linkLabel,
      href: link.url,
      type: link.linkType,
    })),
    children: artist.trackGroups?.map((trackGroup: TrackGroup) =>
      serializeSingleTrackGroupIntoCanimus(trackGroup, artistUrl, artist.name)
    ),
  };
};

export const serializeSingleDeletedArtistIntoCanimus = (
  artist: LocalArtist
) => {
  const artistUrl = join(String(process.env.API_DOMAIN), artist.urlSlug);
  const deletedArtist = {
    type: "artist",
    name: artist.name,
    url: artistUrl,
  };

  const deletedEntities: any = artist.trackGroups?.map((trackGroup) =>
    serializeSingleDeletedTrackGroupIntoCanimus(trackGroup, artistUrl)
  );
  let output: any = [];
  for (const e of deletedEntities) {
    output = output.concat(e);
  }

  return [deletedArtist].concat(output);
};
