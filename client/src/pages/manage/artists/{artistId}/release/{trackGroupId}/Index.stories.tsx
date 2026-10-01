import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import {
  ARTIST_EXAMPLE,
  TRACK_EXAMPLE,
  TRACK_GROUP_EXAMPLE,
} from "../../../../../../../test/mocks";

import ManageTrackGroupPage from "./Index";

const ARTIST: Artist = { ...ARTIST_EXAMPLE, urlSlug: "example-artist" };

const LICENSES: (License & { name: string })[] = [
  {
    id: 1,
    short: "copyright",
    name: "All rights reserved",
  },
  {
    id: 2,
    short: "CC BY-SA 4.0",
    name: "Creative Commons Attribution-ShareAlike 4.0",
    link: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
];

const makeTrack = (overrides: Partial<Track>): Track => ({
  ...TRACK_EXAMPLE,
  trackGroup: undefined as unknown as TrackGroup,
  trackArtists: [
    {
      artistName: ARTIST.name,
      artistId: ARTIST.id,
      isCoAuthor: true,
      order: 1,
    },
  ],
  license: LICENSES[0],
  licenseId: LICENSES[0].id,
  ...overrides,
});

// Realistic titles: a long one shows how the table handles wrapping.
const TRACKS: Track[] = [
  makeTrack({ id: 42, order: 1, title: "Opening" }),
  makeTrack({
    id: 43,
    order: 2,
    title: "A Considerably Longer Track Title (Extended Live Version)",
    trackArtists: [
      {
        artistName: ARTIST.name,
        artistId: ARTIST.id,
        isCoAuthor: true,
        order: 1,
      },
      { artistName: "Featured Guest", role: "vocals", order: 2 },
    ],
    audio: { ...TRACK_EXAMPLE.audio!, duration: 412 },
  }),
  makeTrack({ id: 44, order: 3, title: "Closer", isPreview: false }),
];

const TRACK_GROUP: TrackGroup = {
  ...TRACK_GROUP_EXAMPLE,
  artist: { ...TRACK_GROUP_EXAMPLE.artist!, ...ARTIST },
  about: "Recorded over a long weekend in a borrowed cabin.",
  credits: "Mixed by Someone. Mastered by Someone Else.",
  catalogNumber: "MIR-001",
  minPrice: 700,
  suggestedPrice: 1000,
  tracks: TRACKS,
};

const trackGroupHandlers = (trackGroup: TrackGroup) => [
  http.get("*/v1/artists/:artistSlug", () =>
    HttpResponse.json({ result: ARTIST })
  ),
  http.get("*/v1/manage/artists", () =>
    HttpResponse.json({ results: [ARTIST] })
  ),
  http.get("*/v1/manage/artists/:artistId", () =>
    HttpResponse.json({ result: ARTIST })
  ),
  http.get("*/v1/manage/trackGroups/:trackGroupId", () =>
    HttpResponse.json({ result: trackGroup })
  ),
  http.get("*/v1/manage/trackGroups/:trackGroupId/recommendedTrackGroups", () =>
    HttpResponse.json({ results: [] })
  ),
  http.get("*/v1/trackGroups/:trackGroupId/supporters/", () =>
    HttpResponse.json({
      results: [],
      total: 0,
      totalAmount: 0,
      totalSupporters: 0,
      totalPledges: 0,
    })
  ),
  http.get("*/v1/licenses", () => HttpResponse.json({ results: LICENSES })),
  http.get("*/v1/tags", () => HttpResponse.json({ results: [] })),
  http.get("*/v1/manage/tracks/:trackId", ({ params }) =>
    HttpResponse.json({
      result: TRACKS.find((t) => String(t.id) === params.trackId) ?? TRACKS[0],
    })
  ),
];

// A ~375px phone (iPhone SE / mini class), the width #1350 is about.
const VIEWPORTS = {
  phone: {
    name: "Phone (375px)",
    styles: { width: "375px", height: "812px" },
    type: "mobile" as const,
  },
  smallPhone: {
    name: "Small phone (320px)",
    styles: { width: "320px", height: "640px" },
    type: "mobile" as const,
  },
  desktop: {
    name: "Desktop (1280px)",
    styles: { width: "1280px", height: "900px" },
    type: "desktop" as const,
  },
};

/**
 * The release editor at /manage/artists/:artistId/release/:trackGroupId:
 * album details, pricing, the track table and the upload box.
 *
 * #1350: on small screens the inputs in this form collapse and the track
 * table overflows. These stories default to a phone viewport to reproduce
 * that; `Desktop` is there for comparison.
 */
const meta = {
  title: "ManageArtist/Release/EditRelease",
  component: ManageTrackGroupPage,
  parameters: {
    layout: "fullscreen",
    viewport: { viewports: VIEWPORTS, defaultViewport: "phone" },
    msw: { handlers: { release: trackGroupHandlers(TRACK_GROUP) } },
    reactRouter: reactRouterParameters({
      location: {
        pathParams: {
          artistId: String(ARTIST.id),
          trackGroupId: String(TRACK_GROUP.id),
        },
      },
      routing: { path: "/manage/artists/:artistId/release/:trackGroupId" },
    }),
  },
} satisfies Meta<typeof ManageTrackGroupPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = {};

export const SmallPhone: Story = {
  parameters: { viewport: { defaultViewport: "smallPhone" } },
};

/** The inline track editor opened on the second track */
export const MobileEditingTrack: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(TRACKS[1].title!);
    const editButtons = canvas.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[1]);
  },
};

/** The inline track editor at 320px, where the clipping is worst */
export const SmallPhoneEditingTrack: Story = {
  ...MobileEditingTrack,
  parameters: { viewport: { defaultViewport: "smallPhone" } },
};

/** No tracks yet: the zip drop zone and upload box are shown */
export const MobileNoTracks: Story = {
  parameters: {
    msw: {
      handlers: {
        release: trackGroupHandlers({ ...TRACK_GROUP, tracks: [] }),
      },
    },
  },
};

export const Desktop: Story = {
  parameters: { viewport: { defaultViewport: "desktop" } },
};
