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

import { addSizesToImage } from "../artist";
import { generateFullStaticImageUrl } from "../images";
import { processSingleMerch } from "../merch";
import {
  finalProfileAvatarBucket,
  finalProfileBackgroundBucket,
  finalCoversBucket,
  finalImageBucket,
} from "../minio";
import { resolvePayee } from "../payments/payee";

import { serializePost } from "./post";
import {
  processSingleTrackGroup,
  serializeSingleTrackGroupIntoCanimus,
  LocalTrackGroup,
} from "./trackGroup";
import {
  stripApPrivateKey,
  toApiArtistLabel,
  toApiArtistLabelWithArtist,
  toApiSubscriptionTier,
  toApiUserFields,
} from "./apiNaming";

interface LocalArtist extends Profile {
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

interface LocalArtistLabel {
  artistId: number;
  artist?: LocalArtist;
  labelUserId: number;
  labelUser?: {
    profiles?: LocalArtist[];
    artists?: LocalArtist[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const enrichRosterArtist = (
  labelArtist: LocalArtist,
  userId?: number
): Record<string, unknown> => {
  const alArtistPublic = stripApPrivateKey(labelArtist);
  return {
    ...alArtistPublic,
    avatar: addSizesToImage(finalProfileAvatarBucket, labelArtist?.avatar),
    background: addSizesToImage(
      finalProfileBackgroundBucket,
      labelArtist?.background
    ),
    trackGroups: labelArtist?.trackGroups?.map((tg) =>
      processSingleTrackGroup(
        {
          ...tg,
          profile: labelArtist,
        } as Parameters<typeof processSingleTrackGroup>[0],
        { loggedInUserId: userId }
      )
    ),
  };
};

/** Label roster row on user.artistLabels: artist is the roster profile. */
const serializeRosterArtistLabel = (
  al: LocalArtistLabel & {
    artist: Profile & {
      avatar?: ProfileAvatar | null;
      background?: ProfileBackground | null;
      trackGroups?: (TrackGroup & {
        cover?: TrackGroupCover | null;
        tracks?: Track[];
      })[];
    };
  },
  userId?: number
) => {
  const { artist: labelArtist } = al;
  return toApiArtistLabelWithArtist(
    al,
    labelArtist ? enrichRosterArtist(labelArtist, userId) : undefined
  );
};

const serializeArtistLabel = (
  al: LocalArtistLabel,
  userId?: number,
  isUserSubscriber?: boolean
): Record<string, unknown> => {
  const { artistId, artist, labelUser, ...rest } = al;
  const apiLabelUser = labelUser ? toApiUserFields(labelUser) : undefined;
  const labelProfiles = (labelUser?.artists ?? labelUser?.profiles) as
    | LocalArtist[]
    | undefined;
  return {
    ...toApiArtistLabel({
      ...rest,
      artistId,
      artist: artist ? stripApPrivateKey(artist) : undefined,
    }),
    labelUser: apiLabelUser
      ? {
          ...apiLabelUser,
          artists: labelProfiles?.map((labelProfile) =>
            processSingleArtist(labelProfile, userId, isUserSubscriber)
          ),
        }
      : undefined,
  };
};

export const processSingleArtist = (
  artist: LocalArtist,
  userId?: number,
  isUserSubscriber?: boolean
): Record<string, unknown> => {
  const { apPrivateKey: _, artistLabels, ...artistPublic } = artist;
  return {
    ...artistPublic,
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
      processSingleMerch(m, {
        fallbackCurrency: artist?.user?.currency ?? undefined,
      })
    ),
    background: addSizesToImage(
      finalProfileBackgroundBucket,
      artist?.background
    ),
    avatar: addSizesToImage(finalProfileAvatarBucket, artist?.avatar),
    trackGroups: artist?.trackGroups?.map((tg) =>
      processSingleTrackGroup(
        { ...tg, profile: { ...tg.profile, user: artist.user } },
        { loggedInUserId: userId }
      )
    ),
    subscriptionTiers: artist.subscriptionTiers?.map((tier) => ({
      ...toApiSubscriptionTier(tier),
      images: tier.images?.map((img) => ({
        ...img,
        image: addSizesToImage(finalImageBucket, img.image),
      })),
      releases: tier.releases?.map((rel) => ({
        ...rel,
        trackGroup: processSingleTrackGroup(
          {
            ...rel.trackGroup,
            profileId: tier.profileId,
            profile: artist,
          } as Parameters<typeof processSingleTrackGroup>[0],
          { loggedInUserId: userId }
        ),
      })),
    })),
    user: artist.user
      ? {
          ...artist.user,
          artistLabels: artist.user.artistLabels?.map((al) =>
            serializeRosterArtistLabel(
              al as Parameters<typeof serializeRosterArtistLabel>[0],
              userId
            )
          ),
        }
      : artist.user,
  };
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
              finalProfileAvatarBucket
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
