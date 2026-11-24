import type { TrackArtistAppearance } from "@mirlo/prisma/client";

export type ArtistLink = {
  name: string;
  urlSlug?: string;
  artistId?: number;
  role?: string;
};

export type ReleaseArtistsSource = "credited" | "owner";
export type MainArtistsSource = "track" | "release";

export type ReleaseArtistRow = {
  id?: string;
  artistName: string;
  profileId: number | null;
  order: number;
  profile?: { urlSlug: string | null } | null;
};

export type TrackArtistRow = {
  artistName: string | null;
  artistId: number | null;
  appearsAs: TrackArtistAppearance;
  order: number;
  role?: string | null;
};

type ReleaseOwner =
  | { id?: number; name?: string | null; urlSlug?: string | null }
  | null
  | undefined;

export const trackGroupArtistsInclude = {
  orderBy: [{ order: "asc" as const }, { id: "asc" as const }],
  include: {
    profile: { select: { id: true, name: true, urlSlug: true } },
  },
};

const byOrder = <T extends { order: number }>(rows: T[]) =>
  [...rows].sort((a, b) => a.order - b.order);

export const resolveReleaseArtists = (
  trackGroupArtists: ReleaseArtistRow[],
  owner: ReleaseOwner
): {
  releaseArtists: ArtistLink[];
  releaseArtistsSource: ReleaseArtistsSource;
} => {
  const credited = byOrder(trackGroupArtists);
  if (credited.length > 0) {
    return {
      releaseArtistsSource: "credited",
      releaseArtists: credited.map((row) => ({
        name: row.artistName.trim(),
        urlSlug: row.profile?.urlSlug ?? owner?.urlSlug ?? undefined,
        artistId: row.profileId ?? undefined,
      })),
    };
  }
  const ownerName = owner?.name?.trim();
  return {
    releaseArtistsSource: "owner",
    releaseArtists: ownerName
      ? [
          {
            name: ownerName,
            urlSlug: owner?.urlSlug ?? undefined,
            artistId: owner?.id,
          },
        ]
      : [],
  };
};

export const serializeTrackGroupArtists = <Row extends ReleaseArtistRow>(
  rows: Row[] | undefined
) =>
  rows?.map(({ profileId, profile, ...row }) => ({
    ...row,
    artistId: profileId,
    artist: profile,
  }));

export const normalizeArtistName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export const resolveTrackArtists = (
  trackArtists: TrackArtistRow[],
  releaseArtists: ArtistLink[]
): {
  mainArtists: ArtistLink[];
  featuredArtists: ArtistLink[];
  mainArtistsSource: MainArtistsSource;
} => {
  const listed = byOrder(trackArtists)
    .filter(
      (row): row is TrackArtistRow & { artistName: string } =>
        !!row.artistName?.trim()
    )
    .map((row) => ({
      appearsAs: row.appearsAs,
      link: {
        name: row.artistName.trim(),
        artistId: row.artistId ?? undefined,
        role: row.role?.trim() || undefined,
      },
    }));
  const ownMain = listed
    .filter((row) => row.appearsAs === "MAIN")
    .map((row) => row.link);
  const mainArtists = ownMain.length > 0 ? ownMain : releaseArtists;
  const mainNames = new Set(
    mainArtists.map((link) => normalizeArtistName(link.name))
  );
  return {
    mainArtists,
    mainArtistsSource: ownMain.length > 0 ? "track" : "release",
    featuredArtists: listed
      .filter(
        (row) =>
          row.appearsAs === "FEATURED" &&
          !mainNames.has(normalizeArtistName(row.link.name))
      )
      .map((row) => row.link),
  };
};

export const joinArtistNames = (links: ArtistLink[]) => {
  const names = links.map((link) => link.name);
  return names.length > 1
    ? `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`
    : (names[0] ?? "");
};

export const trackArtistText = (artists: {
  mainArtists: ArtistLink[];
  featuredArtists: ArtistLink[];
}) => {
  const main = joinArtistNames(artists.mainArtists);
  return artists.featuredArtists.length > 0
    ? `${main} with ${joinArtistNames(artists.featuredArtists)}`
    : main;
};

export const releaseArtistsWhenLoaded = (
  trackGroup: { trackGroupArtists?: ReleaseArtistRow[] },
  owner: ReleaseOwner
): Partial<ReturnType<typeof resolveReleaseArtists>> =>
  trackGroup.trackGroupArtists
    ? resolveReleaseArtists(trackGroup.trackGroupArtists, owner)
    : {};

export const releaseArtistText = (
  trackGroupArtists: ReleaseArtistRow[],
  owner: ReleaseOwner
) =>
  joinArtistNames(
    resolveReleaseArtists(trackGroupArtists, owner).releaseArtists
  );

export const trackArtistTextForRelease = (
  trackArtists: TrackArtistRow[],
  trackGroupArtists: ReleaseArtistRow[],
  owner: ReleaseOwner
) =>
  trackArtistText(
    resolveTrackArtists(
      trackArtists,
      resolveReleaseArtists(trackGroupArtists, owner).releaseArtists
    )
  );
