import { MERCH_EXAMPLE } from "../../../test/mocks";
import { RELEASES, SHOWCASE_ARTIST } from "../shared/fixtures";

const merchImage = (file: string) => {
  const url = `/showcase/${file}`;
  return {
    id: url,
    merchId: "",
    imageId: null,
    position: 0,
    url: [url],
    updatedAt: "2026-09-01T00:00:00Z",
    sizes: {
      60: `/showcase/${file.replace("fees-", "fees-thumb-")}`,
      120: url,
      300: url,
      600: url,
      960: url,
      1200: url,
    },
  };
};

const merch = (
  id: number,
  title: string,
  urlSlug: string,
  file: string,
  minPrice: number,
  overrides: Partial<Merch> = {}
): Merch => ({
  ...MERCH_EXAMPLE,
  id: `5b1e7d2c-0000-4000-8000-00000000000${id}`,
  artistId: SHOWCASE_ARTIST.id,
  artist: SHOWCASE_ARTIST,
  title,
  urlSlug,
  catalogNumber: `LT-00${id}`,
  minPrice,
  images: [merchImage(file)],
  order: id,
  ...overrides,
});

export const SHOWCASE_MERCH: Merch[] = [
  merch(
    1,
    'Tidal Hours on sea glass 12" vinyl',
    "tidal-hours-vinyl",
    "fees-merch-vinyl.svg",
    2800,
    { includePurchaseTrackGroupId: RELEASES.tidal.id }
  ),
  merch(
    2,
    "Moss Choir cassette",
    "moss-choir-cassette",
    "fees-merch-cassette.svg",
    1000,
    { includePurchaseTrackGroupId: RELEASES.moss.id }
  ),
  merch(3, "Tide chart tee", "tide-chart-tee", "fees-merch-tee.svg", 2500),
  merch(4, "Harbour tote bag", "harbour-tote", "fees-merch-tote.svg", 1800),
];

/**
 * The releases, with a 60px cover thumbnail: list rows size the image from
 * its intrinsic width, and the full covers are 1200px SVGs.
 */
export const RELEASES_WITH_THUMBS: TrackGroup[] = Object.values(RELEASES).map(
  (release) => {
    const file = release.cover?.id ?? "";
    return {
      ...release,
      cover: release.cover && {
        ...release.cover,
        sizes: { ...release.cover.sizes, 60: `/showcase/fees-thumb-${file}` },
      },
    };
  }
);

/** The artist's approved label, who can be chosen to receive payments. */
export const SHOWCASE_LABEL: ArtistLabel = {
  artistId: SHOWCASE_ARTIST.id,
  artist: SHOWCASE_ARTIST,
  labelUserId: 31,
  labelUser: {
    id: 31,
    name: "Driftwood Records",
    email: "hello@driftwood.example",
    artists: [
      {
        ...SHOWCASE_ARTIST,
        id: 31,
        userId: 31,
        name: "Driftwood Records",
        urlSlug: "driftwood-records",
        isLabelProfile: true,
      },
    ],
  },
  isLabelApproved: true,
  isArtistApproved: true,
  canLabelManageArtist: true,
  canLabelAddReleases: true,
  isDisplayedOnArtistPage: true,
};
