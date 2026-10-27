import { Prisma } from "@mirlo/prisma/client";

import { federatedProfile, whereForVisibleProfile } from "./artist";
import { whereForPublishedTrackGroups } from "./trackGroup";

export const whereForListedProfile = (
  fullCatalog: boolean
): Prisma.ProfileWhereInput => ({
  ...whereForVisibleProfile(),
  ...(fullCatalog ? {} : federatedProfile),
});

export const listedTracks: Prisma.TrackWhereInput = {
  deletedAt: null,
  audio: {
    uploadState: "SUCCESS",
  },
};

export const whereForListedTrackGroups = (): Prisma.TrackGroupWhereInput => ({
  ...whereForPublishedTrackGroups(),
  // only if they have some track
  tracks: {
    some: listedTracks,
  },
});

export const listedTrackGroupInclude = {
  cover: true,
  tracks: {
    where: listedTracks,
    include: {
      audio: { select: { duration: true } },
    },
    orderBy: { order: "asc" },
  },
} satisfies Prisma.TrackGroupInclude;

export const listedProfileInclude = () =>
  ({
    trackGroups: {
      where: whereForListedTrackGroups(),
      include: listedTrackGroupInclude,
      orderBy: { orderIndex: "asc" },
    },
    avatar: true,
    user: { select: { stripeAccountId: true } },
    paymentToUser: { select: { stripeAccountId: true } },
  }) satisfies Prisma.ProfileInclude;
