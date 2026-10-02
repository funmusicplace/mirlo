/**
 * Shared, realistic-looking data for the Showcase stories, which exist to be
 * screen recorded for social posts. Everything here is fictional. Images are
 * served from .storybook/public/showcase.
 */
import {
  ARTIST_EXAMPLE,
  TRACK_EXAMPLE,
  TRACK_GROUP_EXAMPLE,
} from "../../../test/mocks";

const image = (file: string) => {
  const url = `/showcase/${file}`;
  return {
    id: file,
    url: [url],
    updatedAt: "2026-09-01T00:00:00Z",
    sizes: {
      "60": url,
      "120": url,
      "300": url,
      "600": url,
      "960": url,
      "1200": url,
      "1500": url,
      // Page backgrounds and the image uploader ask for these sizes.
      "2500": url,
      "625": url,
      original: url,
    },
  };
};

export const COVERS = {
  tidal: image("cover-tidal.svg"),
  moss: image("cover-moss.svg"),
  ember: image("cover-ember.svg"),
  dusk: image("cover-dusk.svg"),
};

export const SHOWCASE_ARTIST: Artist = {
  ...ARTIST_EXAMPLE,
  id: 7,
  userId: 1,
  name: "Lumen Tide",
  urlSlug: "lumen-tide",
  shortDescription: "Ambient folk from the north coast",
  bio: "Lumen Tide is a duo writing slow, tide-shaped songs on a borrowed harmonium and a pile of tape loops.",
  location: "Halifax, NS",
  activityPub: true,
  defaultPlatformFee: 7,
  avatar: { ...image("avatar.svg"), url: "/showcase/avatar.svg" },
  background: { ...image("banner.svg"), url: "/showcase/banner.svg" },
  properties: {
    colors: {
      background: "#f6f1e7",
      text: "#0f2d4a",
      button: "#1d7a8c",
      buttonText: "#ffffff",
    },
  },
};

/** The artist summary embedded on releases */
const ARTIST_ON_RELEASE = {
  ...TRACK_GROUP_EXAMPLE.artist!,
  ...SHOWCASE_ARTIST,
};

const TRACK_TITLES = [
  ["Low Water", 214],
  ["Harbour Lights", 263],
  ["Salt in the Tape", 187],
  ["What the Gulls Said", 301],
  ["Fog Bell", 242],
  ["Slack Tide", 356],
] as const;

export const makeTracks = (trackGroupId: number, count = 6): Track[] =>
  TRACK_TITLES.slice(0, count).map(([title, duration], i) => ({
    ...TRACK_EXAMPLE,
    id: trackGroupId * 100 + i + 1,
    trackGroupId,
    trackGroup: undefined as unknown as TrackGroup,
    order: i + 1,
    title,
    artistId: SHOWCASE_ARTIST.id,
    trackArtists: [
      {
        artistName: SHOWCASE_ARTIST.name,
        artistId: SHOWCASE_ARTIST.id,
        isCoAuthor: true,
        order: 1,
      },
    ],
    audio: {
      ...TRACK_EXAMPLE.audio!,
      duration,
      originalFilename: `${String(i + 1).padStart(2, "0")} ${title}.flac`,
    },
  }));

const release = (
  id: number,
  title: string,
  urlSlug: string,
  cover: (typeof COVERS)[keyof typeof COVERS],
  overrides: Partial<TrackGroup> = {}
): TrackGroup => ({
  ...TRACK_GROUP_EXAMPLE,
  id,
  artistId: SHOWCASE_ARTIST.id,
  title,
  urlSlug,
  artist: ARTIST_ON_RELEASE,
  cover,
  about: "Recorded over a long winter in a converted boathouse.",
  credits: "Mixed by Ada Rivers. Mastered by Theo Marsh.",
  releaseDate: "2026-09-12T00:00:00Z",
  // Without this, isTrackGroupPublished() hides the buy button for fans.
  publishedAt: "2026-09-12T00:00:00Z",
  minPrice: 700,
  suggestedPrice: 1000,
  currency: "usd",
  tracks: makeTracks(id),
  ...overrides,
});

export const RELEASES = {
  tidal: release(71, "Tidal Hours", "tidal-hours", COVERS.tidal),
  moss: release(72, "Moss Choir", "moss-choir", COVERS.moss, {
    releaseDate: "2025-04-02T00:00:00Z",
    minPrice: 500,
  }),
  ember: release(73, "Ember Rooms", "ember-rooms", COVERS.ember, {
    releaseDate: "2024-11-20T00:00:00Z",
  }),
  dusk: release(74, "Dusk Signals (EP)", "dusk-signals", COVERS.dusk, {
    releaseDate: "2024-03-08T00:00:00Z",
    minPrice: 300,
    tracks: makeTracks(74, 4),
  }),
};

export const SHOWCASE_ARTIST_WITH_RELEASES: Artist = {
  ...SHOWCASE_ARTIST,
  trackGroups: Object.values(RELEASES),
};

/** A desktop-sized viewport that records cleanly at 1280x800 */
export const SHOWCASE_VIEWPORTS = {
  recording: {
    name: "Recording (1280x800)",
    styles: { width: "1280px", height: "800px" },
    type: "desktop" as const,
  },
  phone: {
    name: "Phone (390px)",
    styles: { width: "390px", height: "844px" },
    type: "mobile" as const,
  },
};
