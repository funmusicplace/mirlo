import { join } from "path";

import {
  Profile,
  ProfileAvatar,
  ProfileBackground,
  ProfileSubscriptionTier,
  Image,
  Merch,
  MerchImage,
  Post,
  Track,
  TrackGroup,
  TrackGroupCover,
} from "@mirlo/prisma/client";

import { addSizesToImage } from "../utils/artist";
import { generateFullStaticImageUrl } from "../utils/images";
import {
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
} from "../utils/minio";
import { resolvePayee } from "../utils/payments/payee";

import {
  omitApPrivateKey,
  renameProfileIdToArtistId,
  Serialized,
} from "./utils";
import { LocalArtistLabel, serializeArtistLabel } from "./artistLabel";
import { serializeMerch } from "./merch";
import { serializePost } from "./post";
import { serializeProfileSubscriptionTier } from "./profileSubscriptionTier";
import {
  processSingleTrackGroup,
  serializeSingleTrackGroupIntoCanimus,
  LocalTrackGroup,
} from "./trackGroup";

export interface LocalArtist extends Profile {
  artistLabels?: LocalArtistLabel[];
  posts?: Post[];
  background?: ProfileBackground | null;
  avatar?: ProfileAvatar | null;
  trackGroups?: LocalTrackGroup[] | null;
  merch?: (Merch & { images?: MerchImage[] })[];
  subscriptionTiers?: (ProfileSubscriptionTier & {
    images?: { image: Image }[];
    releases?: { trackGroup: { cover?: TrackGroupCover | null } }[];
  })[];
  paymentToUser?: {
    stripeAccountId?: string | null;
  } | null;
  user?: {
    stripeAccountId?: string | null;
    currency?: string | null;
    artistLabels?: {
      artist: Profile & {
        avatar?: ProfileAvatar | null;
        background?: ProfileBackground | null;
        trackGroups?: (TrackGroup & {
          cover?: TrackGroupCover | null;
          tracks?: Track[];
        })[];
      };
    }[];
    [key: string]: unknown;
  } | null;
}

export const processSingleArtist = <T extends LocalArtist>(
  artist: T,
  userId?: number,
  isUserSubscriber?: boolean
): Serialized<T> => {
  const { artistLabels, ...profileRest } = artist;
  return {
    ...omitApPrivateKey(profileRest),
    artistLabels: artistLabels?.map((al) =>
      serializeArtistLabel(al as LocalArtistLabel, userId, isUserSubscriber)
    ),
    posts: artist?.posts?.map((p: Post) =>
      serializePost(
        p,
        undefined,
        undefined,
        isUserSubscriber || artist.userId === userId
      )
    ),
    merch: artist?.merch?.map((m) =>
      serializeMerch(m, {
        fallbackCurrency: artist?.user?.currency ?? undefined,
      })
    ),
    background: renameProfileIdToArtistId(
      addSizesToImage(finalArtistBackgroundBucket, artist?.background)
    ),
    avatar: renameProfileIdToArtistId(
      addSizesToImage(finalArtistAvatarBucket, artist?.avatar)
    ),
    trackGroups: artist?.trackGroups?.map((tg) =>
      processSingleTrackGroup(
        { ...tg, profile: { ...tg.profile, user: artist.user } },
        { loggedInUserId: userId }
      )
    ),
    subscriptionTiers: artist.subscriptionTiers?.map((tier) =>
      serializeProfileSubscriptionTier(tier)
    ),
    user: artist.user
      ? {
          ...artist.user,
          artistLabels: artist.user.artistLabels?.map((al) => {
            const { artist: labelProfile, ...rest } = al;
            return {
              ...rest,
              artist: labelProfile
                ? {
                    ...omitApPrivateKey(labelProfile),
                    avatar: renameProfileIdToArtistId(
                      addSizesToImage(
                        finalArtistAvatarBucket,
                        labelProfile.avatar
                      )
                    ),
                    background: renameProfileIdToArtistId(
                      addSizesToImage(
                        finalArtistBackgroundBucket,
                        labelProfile.background
                      )
                    ),
                    trackGroups: labelProfile.trackGroups?.map((tg) =>
                      processSingleTrackGroup(
                        {
                          ...tg,
                          profile: labelProfile,
                        } as Parameters<typeof processSingleTrackGroup>[0],
                        { loggedInUserId: userId }
                      )
                    ),
                  }
                : undefined,
            };
          }),
        }
      : artist.user,
  } as Serialized<T>;
};

export const serializeSingleArtistIntoCanimus = (artist: LocalArtist) => {
  const artistUrl = new URL(artist.urlSlug, String(process.env.API_DOMAIN))
    .href;
  const avatarString = artist.avatar?.url.find((u) => u.includes("x600"));
  const artistLinks = artist.linksJson.map((link: any) => ({
    name: link.linkLabel,
    href: link.url,
    type: link.linkType,
    rel: "me",
  }));
  const artistSupportsPayment = Boolean(
    resolvePayee({
      artist: { user: artist.user, paymentToUser: artist.paymentToUser },
    })?.stripeAccountId
  );
  if (artistSupportsPayment) {
    artistLinks.unshift({
      name: "Support",
      href: new URL("support", `${artistUrl}/`).href,
      type: "Support",
      rel: "support",
    });
  }

  return {
    type: "artist",
    name: artist.name,
    url: artistUrl,
    images: {
      cover: avatarString
        ? {
            src: generateFullStaticImageUrl(
              avatarString,
              finalArtistAvatarBucket
            ),
            alt: null,
            width: 600,
            height: 600,
          }
        : undefined,
    },
    summary: artist.shortDescription,
    description: artist.bio,
    links: artistLinks,
    updated_date: artist.updatedAt?.toISOString().split("T")[0],
    children: artist.trackGroups?.map((trackGroup: TrackGroup) =>
      serializeSingleTrackGroupIntoCanimus(
        trackGroup,
        artistUrl,
        artist.name,
        artistSupportsPayment
      )
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
  return deletedArtist;
};
