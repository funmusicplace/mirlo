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
  finalArtistAvatarBucket,
  finalArtistBackgroundBucket,
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

interface LocalProfile extends Profile {
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
  artist?: LocalProfile;
  labelUserId: number;
  labelUser?: {
    profiles?: LocalProfile[];
    artists?: LocalProfile[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const enrichRosterProfile = (
  labelProfile: LocalProfile,
  userId?: number
): Record<string, unknown> => {
  const { apPrivateKey: _, ...alProfilePublic } = labelProfile;
  return {
    ...alProfilePublic,
    avatar: addSizesToImage(finalArtistAvatarBucket, labelProfile?.avatar),
    background: addSizesToImage(
      finalArtistBackgroundBucket,
      labelProfile?.background
    ),
    trackGroups: labelProfile?.trackGroups?.map((tg) =>
      processSingleTrackGroup(
        {
          ...tg,
          profile: labelProfile,
        } as Parameters<typeof processSingleTrackGroup>[0],
        { loggedInUserId: userId }
      )
    ),
  };
};

/** Label roster row on user.artistLabels: artist is the roster profile. */
const serializeRosterArtistLabel = (
  al: LocalArtistLabel & {
    profile: Profile & {
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
  const { artist: labelProfile, profile: _profile, ...rest } = al as LocalArtistLabel & {
    artist: LocalProfile;
    profile?: unknown;
  };
  return {
    ...rest,
    artist: labelProfile ? enrichRosterProfile(labelProfile, userId) : undefined,
  };
};

const serializeArtistLabel = (
  al: LocalArtistLabel,
  userId?: number,
  isUserSubscriber?: boolean
): Record<string, unknown> => {
  const { artistId, artist, labelUser, profile: _profile, ...rest } = al as LocalArtistLabel & {
    profile?: unknown;
  };
  const { profiles, artists, profileUserSubscriptions, ...labelUserRest } =
    (labelUser ?? {}) as {
      profiles?: LocalProfile[];
      artists?: LocalProfile[];
      profileUserSubscriptions?: unknown[];
      [key: string]: unknown;
    };
  const labelProfiles = (artists ?? profiles) as LocalProfile[] | undefined;
  const { apPrivateKey: _, ...profilePublic } = artist ?? {};
  return {
    ...rest,
    artistId,
    artist: artist ? profilePublic : undefined,
    labelUser: labelUser
      ? {
          ...labelUserRest,
          artists: labelProfiles?.map((labelProfile) =>
            processSingleProfile(labelProfile, userId, isUserSubscriber)
          ),
          ...(profileUserSubscriptions !== undefined
            ? {
                artistUserSubscriptions: profileUserSubscriptions,
              }
            : {}),
        }
      : undefined,
  };
};

export const processSingleProfile = (
  profile: LocalProfile,
  userId?: number,
  isUserSubscriber?: boolean
): Record<string, unknown> => {
  const { apPrivateKey: _, artistLabels, ...profilePublic } = profile;
  return {
    ...profilePublic,
    artistLabels: artistLabels?.map((al) =>
      serializeArtistLabel(al as LocalArtistLabel, userId, isUserSubscriber)
    ),
    posts: profile?.posts?.map((p: Post) =>
      serializePost(
        p,
        undefined,
        undefined,
        isUserSubscriber || profile.userId === userId
      )
    ),
    merch: profile?.merch?.map((m) =>
      processSingleMerch(m, {
        fallbackCurrency: profile?.user?.currency ?? undefined,
      })
    ),
    background: addSizesToImage(
      finalArtistBackgroundBucket,
      profile?.background
    ),
    avatar: addSizesToImage(finalArtistAvatarBucket, profile?.avatar),
    trackGroups: profile?.trackGroups?.map((tg) =>
      processSingleTrackGroup(
        { ...tg, profile: { ...tg.profile, user: profile.user } },
        { loggedInUserId: userId }
      )
    ),
    subscriptionTiers: profile.subscriptionTiers?.map((tier) => {
      const { profileId, profile: _profile, ...tierRest } = tier as ProfileSubscriptionTier & {
        profileId?: number;
        profile?: unknown;
        images?: { image: Image }[];
        releases?: { trackGroup: { cover?: TrackGroupCover | null } }[];
      };
      return {
        ...tierRest,
        artistId: profileId,
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
              profile: profile,
            } as Parameters<typeof processSingleTrackGroup>[0],
            { loggedInUserId: userId }
          ),
        })),
      };
    }),
    user: profile.user
      ? {
          ...profile.user,
          artistLabels: profile.user.artistLabels?.map((al) => {
            const { apPrivateKey: _pk, ...alProfilePublic } = al.artist ?? {};
            return {
              ...al,
              artist: {
                ...alProfilePublic,
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
            };
          }),
        }
      : profile.user,
  };
};

export const serializeSingleProfileIntoCanimus = (profile: LocalProfile) => {
  const profileUrl = new URL(profile.urlSlug, String(process.env.API_DOMAIN))
    .href;
  const avatarString = profile.avatar?.url.find((u) => u.includes("x600"));
  const profileLinks = profile.linksJson.map((link: any) => ({
    name: link.linkLabel,
    href: link.url,
    type: link.linkType,
    rel: "me",
  }));
  const profileSupportsPayment = Boolean(
    resolvePayee({
      profile: { user: profile.user, paymentToUser: profile.paymentToUser },
    })?.stripeAccountId
  );
  if (profileSupportsPayment) {
    profileLinks.unshift({
      name: "Support",
      href: new URL("support", `${profileUrl}/`).href,
      type: "Support",
      rel: "support",
    });
  }

  return {
    type: "artist",
    name: profile.name,
    url: profileUrl,
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
    summary: profile.shortDescription,
    description: profile.bio,
    links: profileLinks,
    updated_date: profile.updatedAt?.toISOString().split("T")[0],
    children: profile.trackGroups?.map((trackGroup: TrackGroup) =>
      serializeSingleTrackGroupIntoCanimus(
        trackGroup,
        profileUrl,
        profile.name,
        profileSupportsPayment
      )
    ),
  };
};

export const serializeSingleDeletedProfileIntoCanimus = (
  profile: LocalProfile
) => {
  const profileUrl = join(String(process.env.API_DOMAIN), profile.urlSlug);
  const deletedProfile = {
    type: "artist",
    name: profile.name,
    url: profileUrl,
  };
  return deletedProfile;
};
