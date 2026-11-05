import prisma from "@mirlo/prisma";
import {
  Image,
  Prisma,
  Profile,
  Track,
  TrackAudio,
  TrackGroup,
} from "@mirlo/prisma/client";

import { whereForVisibleTrackGroup } from "./trackGroup";

export type LibraryTrack = Track & { audio: TrackAudio | null };

export type LibraryAlbum = {
  trackGroup: TrackGroup & {
    profile: Profile & { avatar: Image | null };
    cover: Image | null;
  };
  tracks: LibraryTrack[];
  addedAt: Date;
};

const albumInclude = {
  profile: { include: { avatar: true } },
  cover: true,
} satisfies Prisma.TrackGroupInclude;

// What a buyer keeps seeing and playing: published, not disabled by an admin
// and not deleted, even when the artist hid it from search or left out a cover
export const whereForOwnedTrackGroup = (): Prisma.TrackGroupWhereInput => ({
  ...whereForVisibleTrackGroup(),
  publishedAt: { lte: new Date() },
});

// Everything the user bought, grouped by release: a whole-release purchase
// brings every track, a single-track purchase only that track, and the filter
// narrows both to one release or one artist
export const loadLibrary = async (
  userId: number,
  filter?: { trackGroupId?: number; profileId?: number }
): Promise<LibraryAlbum[]> => {
  const owned: Prisma.TrackGroupWhereInput = {
    ...whereForOwnedTrackGroup(),
    id: filter?.trackGroupId,
    profileId: filter?.profileId,
  };

  const [albumPurchases, trackPurchases] = await Promise.all([
    prisma.userTrackGroupPurchase.findMany({
      where: { userId, trackGroup: owned },
      include: {
        transaction: true,
        trackGroup: {
          include: {
            ...albumInclude,
            tracks: {
              where: { deletedAt: null },
              orderBy: { order: "asc" },
              include: { audio: true },
            },
          },
        },
      },
    }),
    prisma.userTrackPurchase.findMany({
      where: { userId, track: { deletedAt: null, trackGroup: owned } },
      include: {
        transaction: true,
        track: {
          include: { audio: true, trackGroup: { include: albumInclude } },
        },
      },
    }),
  ]);

  const albums = new Map<number, LibraryAlbum>();
  const add = (
    trackGroup: LibraryAlbum["trackGroup"],
    tracks: LibraryTrack[],
    addedAt: Date
  ) => {
    const album = albums.get(trackGroup.id) ?? {
      trackGroup,
      tracks: [],
      addedAt,
    };
    for (const track of tracks) {
      if (!album.tracks.some(({ id }) => id === track.id)) {
        album.tracks.push(track);
      }
    }
    if (addedAt > album.addedAt) {
      album.addedAt = addedAt;
    }
    albums.set(trackGroup.id, album);
  };

  for (const purchase of albumPurchases) {
    add(
      purchase.trackGroup,
      purchase.trackGroup.tracks,
      purchase.transaction?.createdAt ?? purchase.createdAt
    );
  }
  for (const purchase of trackPurchases) {
    add(
      purchase.track.trackGroup,
      [purchase.track],
      purchase.transaction?.createdAt ?? purchase.datePurchased
    );
  }

  return [...albums.values()].map((album) => ({
    ...album,
    tracks: album.tracks.sort((a, b) => a.order - b.order || a.id - b.id),
  }));
};

// Plays under the same rule as the library, so a release that is unpublished,
// disabled by an admin or deleted stops playing for earlier buyers too
export const findOwnedTrack = (userId: number, trackId: number) =>
  prisma.track.findFirst({
    where: {
      id: trackId,
      trackGroup: whereForOwnedTrackGroup(),
      OR: [
        { userTrackPurchases: { some: { userId } } },
        { trackGroup: { userTrackGroupPurchases: { some: { userId } } } },
      ],
    },
    include: { audio: true },
  });
