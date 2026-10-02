import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import BuyTrackModal from "components/Player/BuyTrackModal";
import { delay, http, HttpResponse } from "msw";
import ArtistLayout from "pages/{artistId}/Layout";
import ReleaseDownloadPage from "pages/{artistId}/release/{trackGroupId}/download/Index";
import ReleasePage from "pages/{artistId}/release/{trackGroupId}/Index";
import TrackPage from "pages/{artistId}/release/{trackGroupId}/tracks/{trackId}/Index";
import ArtistReleases from "pages/{artistId}/releases/Index";
import React from "react";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { stripeStatusHandlers } from "../../../.storybook/handlers";
import { withArtistColors } from "../shared/AppFrame";
import {
  RELEASES,
  SHOWCASE_ARTIST,
  SHOWCASE_ARTIST_WITH_RELEASES,
} from "../shared/fixtures";
import { recordingViewport, authAs } from "../shared/helpers";

/**
 * Listener-side buying: pay what you want, buy the whole catalogue, and pick
 * a download format.
 */

/** The shared fixtures have no publishedAt, which hides the buy buttons */
const published = (release: TrackGroup): TrackGroup => ({
  ...release,
  publishedAt: release.releaseDate,
});

const PUBLISHED_RELEASES =
  SHOWCASE_ARTIST_WITH_RELEASES.trackGroups.map(published);

/** The artist as the public API returns it, with the payout currency set */
const ARTIST: Artist = {
  ...SHOWCASE_ARTIST_WITH_RELEASES,
  trackGroups: PUBLISHED_RELEASES,
  user: { id: SHOWCASE_ARTIST.userId, currency: "usd" },
  purchaseEntireCatalogEnabled: true,
};

const RELEASE: TrackGroup = {
  ...published(RELEASES.tidal),
  // Single tracks sell for $1.50 and up
  tracks: RELEASES.tidal.tracks.map((track) => ({ ...track, minPrice: 150 })),
  about:
    "Six songs recorded over a long winter in a converted boathouse on the Bay of Fundy: harmonium, tape loops, and whatever the weather was doing that day.",
  tags: ["ambient folk", "tape loops", "harmonium"],
};

const ARTIST_SLUG = ARTIST.urlSlug ?? "lumen-tide";
const RELEASE_SLUG = RELEASE.urlSlug ?? "tidal-hours";

/** A listener account (not the artist), so no manage controls show up */
const LISTENER: LoggedInUser = {
  id: 12,
  email: "maya.okafor@fastmail.com",
  name: "Maya Okafor",
  artists: [],
  isAdmin: false,
  isLabelAccount: false,
  currency: "usd",
  userTrackGroupPurchases: [],
  userTrackPurchases: [],
};

const releaseBySlug = (slug: string | readonly string[] | undefined) =>
  [RELEASE, ...PUBLISHED_RELEASES].find(
    (r) => r.urlSlug === slug || String(r.id) === slug
  ) ?? RELEASE;

const publicHandlers = (release: TrackGroup = RELEASE, artist = ARTIST) => [
  http.get("*/v1/artists/:artistSlug", () =>
    HttpResponse.json({ result: artist })
  ),
  http.get("*/v1/artists/:artistId/purchaseCatalogue", () =>
    HttpResponse.json({ result: { price: 2400 } })
  ),
  http.get("*/v1/trackGroups/:slug/testOwns", () =>
    HttpResponse.json({ result: { exists: true } })
  ),
  ...["*/v1/trackGroups/:slug/", "*/v1/trackGroups/:slug"].map((path) =>
    http.get(path, ({ params }) =>
      HttpResponse.json({
        result:
          params.slug === release.urlSlug
            ? release
            : releaseBySlug(params.slug),
      })
    )
  ),
  http.get("*/v1/labels/:artistSlug/trackGroups", () =>
    HttpResponse.json({ results: [] })
  ),
  http.get("*/v1/trackGroups/:id/recommendedTrackGroups", () =>
    HttpResponse.json({ results: [] })
  ),
  http.get("*/v1/trackGroups/:id/generate", () =>
    HttpResponse.json({ result: true })
  ),
  // Checkout hands off to Stripe, which can't run here: leave the button
  // spinning instead of erroring if it's clicked on camera.
  http.post("*/v1/purchase", async () => {
    await delay("infinite");
    return HttpResponse.json({});
  }),
];

const releaseRoute = (slug: string) =>
  reactRouterParameters({
    location: {
      pathParams: { artistId: ARTIST_SLUG, trackGroupId: slug },
    },
    routing: { path: "/:artistId/release/:trackGroupId" },
  });

const meta = {
  title: "Showcase/Buying",
  component: ReleasePage,
  decorators: [withArtistColors],
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: {
      handlers: {
        auth: authAs(LISTENER),
        stripe: stripeStatusHandlers({ chargesEnabled: true }),
        public: publicHandlers(),
      },
    },
    reactRouter: releaseRoute(RELEASE_SLUG),
  },
} satisfies Meta<typeof ReleasePage>;

export default meta;
type Story = StoryObj<typeof meta>;

const openBuyModal = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const button = await canvas.findByRole(
    "button",
    { name: /^(buy|name your price)$/i },
    { timeout: 5000 }
  );
  await userEvent.click(button);
  // The modal renders in a portal outside the canvas
  await within(document.body).findByLabelText(/name your price/i, undefined, {
    timeout: 5000,
  });
};

const openFormatPicker = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const button = await canvas.findByTestId("download-button", undefined, {
    timeout: 5000,
  });
  await userEvent.click(button);
  await within(document.body).findByText("FLAC");
};

/**
 * Release page for "Tidal Hours", left closed for live recording. Click Buy
 * to show the pay-what-you-want form: $7 minimum, $10 suggested.
 */
export const PayWhatYouWant: Story = {};

/**
 * The pay-what-you-want modal already open. Record bumping the price with
 * the +$ buttons; going above 10x the minimum shows "That's generous".
 */
export const PayWhatYouWantOpen: Story = {
  play: async ({ canvasElement }) => {
    await openBuyModal(canvasElement);
  },
};

/**
 * A logged-out visitor on the same release: no account needed to pay,
 * Stripe checkout collects their email.
 */
export const PayWhatYouWantLoggedOut: Story = {
  parameters: { msw: { handlers: { auth: authAs(null) } } },
  play: async ({ canvasElement }) => {
    await openBuyModal(canvasElement);
  },
};

const ownerOf = (release: TrackGroup): LoggedInUser => ({
  ...LISTENER,
  userTrackGroupPurchases: [{ trackGroupId: release.id }],
});

/**
 * Release the listener already owns: the download icon sits under the
 * cover. Click it to show the format picker (left closed for recording).
 */
export const DownloadFormats: Story = {
  parameters: {
    msw: { handlers: { auth: authAs(ownerOf(RELEASE)) } },
  },
};

/**
 * The format picker open: FLAC, ALAC, WAV, Opus and three MP3 bitrates.
 * Click a format and the Download button appears.
 */
export const DownloadFormatsOpen: Story = {
  ...DownloadFormats,
  play: async ({ canvasElement }) => {
    await openFormatPicker(canvasElement);
  },
};

const emailedLinkRoute = reactRouterParameters({
  location: {
    path: `/${ARTIST_SLUG}/release/${RELEASE_SLUG}/download`,
    pathParams: { artistId: ARTIST_SLUG, trackGroupId: RELEASE_SLUG },
    searchParams: {
      email: "jonas.berg@posteo.net",
      token: "c2hvd2Nhc2UtZG93bmxvYWQ",
    },
  },
  routing: { path: "/:artistId/release/:trackGroupId/download" },
});

/**
 * The page a guest lands on from the "download your release" email: no
 * account, just the emailed link. Left closed: click Download to record
 * picking a format.
 */
export const EmailedDownloadLink: Story = {
  render: () => <ReleaseDownloadPage />,
  parameters: {
    msw: { handlers: { auth: authAs(null) } },
    reactRouter: emailedLinkRoute,
  },
};

/** The emailed download page with the format picker already open */
export const EmailedDownloadLinkOpen: Story = {
  ...EmailedDownloadLink,
  play: async ({ canvasElement }) => {
    await openFormatPicker(canvasElement);
  },
};

/** The artist's releases page, as a route with the artist header */
const catalogueRoute = reactRouterParameters({
  location: {
    path: `/${ARTIST_SLUG}/releases`,
    pathParams: { artistId: ARTIST_SLUG },
  },
  routing: {
    path: "/:artistId",
    useStoryElement: true,
    children: [{ path: "releases", element: <ArtistReleases /> }],
  },
});

/**
 * Lumen Tide's releases page with "Purchase entire catalogue for $24.00" under
 * the four releases. Clicking it leaves the button spinning, since Stripe
 * checkout can't run in Storybook: cut the recording there.
 */
export const BuyEntireCatalogue: Story = {
  render: () => <ArtistLayout />,
  parameters: {
    reactRouter: catalogueRoute,
    msw: {
      handlers: {
        public: publicHandlers(RELEASE, {
          ...ARTIST,
          // One row of four keeps the button above the fold at 1280x800
          properties: { ...ARTIST.properties, releasesPerRow: 4 },
        }),
      },
    },
  },
};

const TRACK = RELEASE.tracks[1];

/**
 * A single track's page ("Harbour Lights"), left closed. Click Buy to show
 * the per-track pay-what-you-want form, starting at $1.50.
 */
export const BuySingleTrack: Story = {
  render: () => <TrackPage />,
  parameters: {
    reactRouter: reactRouterParameters({
      location: {
        pathParams: {
          artistId: ARTIST_SLUG,
          trackGroupId: RELEASE_SLUG,
          trackId: String(TRACK.id),
        },
      },
      routing: { path: "/:artistId/release/:trackGroupId/tracks/:trackId" },
    }),
  },
};

/** The per-track buy modal already open */
export const BuySingleTrackOpen: Story = {
  ...BuySingleTrack,
  play: async ({ canvasElement }) => {
    await openBuyModal(canvasElement);
  },
};

/**
 * What the player shows once a listener has used up their free plays of a
 * track, over the release page. Click Buy to record moving into the
 * pay-what-you-want form for the album.
 */
export const PlayLimitReached: Story = {
  render: () => (
    <>
      <ReleasePage />
      <BuyTrackModal
        showBuyModal
        setShowBuyModal={() => {}}
        trackGroupId={RELEASE.id}
      />
    </>
  ),
};
