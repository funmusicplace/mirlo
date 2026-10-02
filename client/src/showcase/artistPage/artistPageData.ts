/**
 * Data and MSW handlers shared by the artist-page showcase stories
 * (ArtistPage, ArtistCustomize, MerchItem, ReleaseLyrics). Builds on the
 * shared fixtures in ./fixtures.ts.
 */
import { http, HttpResponse } from "msw";

import { stripeStatusHandlers } from "../../../.storybook/handlers";
import {
  RELEASES,
  SHOWCASE_ARTIST,
  SHOWCASE_ARTIST_WITH_RELEASES,
} from "../shared/fixtures";

const merchImage = (file: string) => {
  const url = `/showcase/${file}`;
  return {
    url: [url],
    updatedAt: "2026-09-01T00:00:00Z",
    sizes: { 60: url, 120: url, 300: url, 600: url, 960: url, 1200: url },
  };
};

const FULL_ARTIST_USER = { id: SHOWCASE_ARTIST.userId, currency: "usd" };

const ARTIST_SUMMARY = { ...SHOWCASE_ARTIST, user: FULL_ARTIST_USER };

// --- Release with credits, lyrics and licence ------------------------

export const CC_BY_SA: License & { name: string } = {
  name: "Creative Commons Attribution-ShareAlike 4.0",
  id: 2,
  short: "CC BY-SA 4.0",
  link: "https://creativecommons.org/licenses/by-sa/4.0/",
};

const LYRICS: Record<string, string> = {
  "Low Water": `The harbour empties out at noon
the boats lie down like sleeping dogs
I walk the line the water drew
and count the things the tide forgot

Low water, low water
show me what you hid from me
Low water, low water
I'll be here when you come back to me

A rope, a shoe, a bottle green
a name scratched in a lobster float
the gulls are arguing upstream
about the colour of my coat`,
  "Harbour Lights": `Every light along the harbour
is a word I couldn't say
so I leave them on all winter
and I turn them off in May`,
};

/** Tidal Hours with full credits, lyrics on two songs and a CC licence. */
export const TIDAL_HOURS: TrackGroup = {
  ...RELEASES.tidal,
  publishedAt: RELEASES.tidal.releaseDate,
  artist: { ...RELEASES.tidal.artist!, user: FULL_ARTIST_USER },
  about:
    "Recorded over a long winter in a converted boathouse on the Eastern Shore, with the doors open whenever the weather allowed. You can hear the water on most of these songs — we stopped trying to keep it out.",
  credits: [
    "**Lumen Tide** — Mara Doucette (voice, harmonium, tape loops) and Jonah Ellis (guitar, bass, field recordings)",
    "",
    "Cello on *Slack Tide* by Ines Varga",
    "",
    "Recorded at the Boathouse, Ship Harbour NS",
    "Mixed by Ada Rivers · Mastered by Theo Marsh",
    "Cover photograph by Priya Nair",
  ].join("\n"),
  tags: ["ambient folk", "harmonium", "field recordings", "halifax"],
  tracks: RELEASES.tidal.tracks.map((track) => ({
    ...track,
    lyrics: LYRICS[track.title ?? ""],
    license: CC_BY_SA,
    licenseId: CC_BY_SA.id,
    isPreview: true,
  })),
};

// --- Merch -------------------------------------------------------------

const shipping = (
  merchId: string,
  rows: [string | null, number, number][]
): ShippingDestination[] =>
  rows.map(([destinationCountry, costUnit, costExtraUnit], i) => ({
    id: `${merchId}-ship-${i}`,
    merchId,
    homeCountry: "CA",
    destinationCountry,
    costUnit,
    costExtraUnit,
  }));

const TSHIRT_ID = "5e1c0a7e-1000-4000-8000-000000000001";
const VINYL_ID = "5e1c0a7e-1000-4000-8000-000000000002";
const TOTE_ID = "5e1c0a7e-1000-4000-8000-000000000003";
const POSTER_ID = "5e1c0a7e-1000-4000-8000-000000000004";

const sizeOptions: MerchOption[] = [
  ["S", 12, 0],
  ["M", 20, 0],
  ["L", 18, 0],
  ["XL", 9, 0],
  ["XXL", 4, 200],
].map(([name, quantityRemaining, additionalPrice]) => ({
  id: `tshirt-size-${name}`,
  name: String(name),
  sku: `LT-TEE-${name}`,
  quantityRemaining: Number(quantityRemaining),
  additionalPrice: Number(additionalPrice),
  merchOptionTypeId: "tshirt-size",
}));

const colourOptions: MerchOption[] = [
  ["Harbour navy", 0],
  ["Sea-glass green", 0],
  ["Natural undyed", 300],
].map(([name, additionalPrice], i) => ({
  id: `tshirt-colour-${i}`,
  name: String(name),
  sku: `LT-TEE-C${i}`,
  quantityRemaining: 30,
  additionalPrice: Number(additionalPrice),
  merchOptionTypeId: "tshirt-colour",
}));

const vinylOptions: MerchOption[] = [
  ["Black 180g", 0, 140],
  ["Sea-glass transparent (limited)", 600, 23],
].map(([name, additionalPrice, quantityRemaining], i) => ({
  id: `vinyl-pressing-${i}`,
  name: String(name),
  sku: `LT-LP-${i}`,
  quantityRemaining: Number(quantityRemaining),
  additionalPrice: Number(additionalPrice),
  merchOptionTypeId: "vinyl-pressing",
}));

const baseMerch = {
  artistId: SHOWCASE_ARTIST.id,
  artist: ARTIST_SUMMARY,
  currency: "usd",
  isPublic: true,
  platformPercent: 7,
};

export const MERCH_TSHIRT: Merch = {
  ...baseMerch,
  id: TSHIRT_ID,
  title: "Low Water Tee",
  description:
    "Heavyweight organic cotton, screen printed by hand in Halifax on a press older than both of us. Relaxed fit — size down if you like it snug.\n\nEvery shirt comes with a download code for **Tidal Hours**.",
  catalogNumber: "LT-TEE-01",
  minPrice: 2800,
  urlSlug: "low-water-tee",
  quantityRemaining: 63,
  images: [merchImage("merch-tshirt.svg")],
  itemType: { id: 1, name: "T-shirt" },
  itemTypeId: 1,
  includePurchaseTrackGroupId: RELEASES.tidal.id,
  includePurchaseTrackGroup: RELEASES.tidal,
  optionTypes: [
    {
      id: "tshirt-size",
      optionName: "Size",
      required: true,
      options: sizeOptions,
    },
    {
      id: "tshirt-colour",
      optionName: "Colour",
      required: true,
      options: colourOptions,
    },
  ],
  shippingDestinations: shipping(TSHIRT_ID, [
    ["CA", 600, 200],
    ["US", 900, 300],
    ["GB", 1400, 400],
    ["EU", 1500, 400],
    [null, 2200, 600],
  ]),
  order: 0,
};

export const MERCH_VINYL: Merch = {
  ...baseMerch,
  id: VINYL_ID,
  title: 'Tidal Hours — 12" Vinyl LP',
  description:
    "Pressed at a small plant in Montréal. Gatefold sleeve with a lyric booklet and photographs from the boathouse sessions.\n\nIncludes an instant download of the full album in FLAC and MP3.",
  catalogNumber: "LT-LP-01",
  minPrice: 3200,
  urlSlug: "tidal-hours-vinyl",
  quantityRemaining: 163,
  images: [merchImage("merch-vinyl.svg")],
  itemType: { id: 2, name: "Vinyl" },
  itemTypeId: 2,
  includePurchaseTrackGroupId: RELEASES.tidal.id,
  includePurchaseTrackGroup: RELEASES.tidal,
  optionTypes: [
    {
      id: "vinyl-pressing",
      optionName: "Pressing",
      required: true,
      options: vinylOptions,
    },
  ],
  shippingDestinations: shipping(VINYL_ID, [
    ["CA", 1200, 400],
    ["US", 1600, 500],
    ["EU", 2400, 600],
    [null, 3200, 800],
  ]),
  order: 1,
};

export const MERCH_TOTE: Merch = {
  ...baseMerch,
  id: TOTE_ID,
  title: "Tide Line Tote Bag",
  description: "A sturdy canvas tote for records, groceries, and sea glass.",
  minPrice: 1800,
  urlSlug: "tide-line-tote",
  quantityRemaining: 40,
  images: [merchImage("merch-tote.svg")],
  itemType: { id: 3, name: "Bag" },
  optionTypes: [],
  shippingDestinations: shipping(TOTE_ID, [
    ["CA", 500, 100],
    [null, 1200, 300],
  ]),
  order: 2,
};

export const MERCH_POSTER: Merch = {
  ...baseMerch,
  id: POSTER_ID,
  title: "Autumn Tour 2026 Poster",
  description: "Risograph print, A2, signed by both of us.",
  minPrice: 2000,
  urlSlug: "autumn-tour-poster",
  quantityRemaining: 25,
  images: [merchImage("merch-poster.svg")],
  itemType: { id: 4, name: "Poster" },
  optionTypes: [],
  shippingDestinations: shipping(POSTER_ID, [[null, 800, 200]]),
  order: 3,
};

export const MERCH = [MERCH_VINYL, MERCH_TSHIRT, MERCH_TOTE, MERCH_POSTER];

// --- Posts, tiers, tour dates -----------------------------------------

export const POSTS: Post[] = [
  {
    id: 701,
    title: "We're going on tour this autumn",
    urlSlug: "autumn-tour",
    content:
      "<p>Eight cities, one van, and a harmonium that refuses to stay in tune. We'll have the new vinyl with us at every show.</p>",
    publishedAt: "2026-09-20T15:00:00Z",
    isPublic: true,
    artistId: SHOWCASE_ARTIST.id,
    isContentHidden: false,
    isDraft: false,
  },
  {
    id: 702,
    title: "Tidal Hours is out now",
    urlSlug: "tidal-hours-out-now",
    content:
      "<p>Six songs recorded over a long winter in a converted boathouse. Thank you for waiting with us.</p>",
    publishedAt: "2026-09-12T12:00:00Z",
    isPublic: true,
    artistId: SHOWCASE_ARTIST.id,
    isContentHidden: false,
    isDraft: false,
  },
  {
    id: 703,
    title: "Notes from the boathouse",
    urlSlug: "notes-from-the-boathouse",
    content:
      "<p>A few photos and voice memos from the sessions, for supporters first.</p>",
    publishedAt: "2026-08-02T12:00:00Z",
    isPublic: false,
    artistId: SHOWCASE_ARTIST.id,
    isContentHidden: true,
    isDraft: false,
  },
].map((p) => ({ ...p, artist: ARTIST_SUMMARY }));

const tierImage = (file: string) => {
  const url = `/showcase/${file}`;
  return {
    imageId: file,
    image: {
      id: file,
      url: [url],
      sizes: { 60: url, 120: url, 300: url, 600: url, 960: url },
      updatedAt: "2026-09-01T00:00:00Z",
    },
  };
};

export const TIERS: ArtistSubscriptionTier[] = [
  {
    id: 801,
    artistId: SHOWCASE_ARTIST.id,
    artist: SHOWCASE_ARTIST,
    name: "Follow",
    description: "Get our updates by email.",
    minAmount: 0,
    interval: "MONTH",
    isDefaultTier: true,
    platformPercent: 7,
    images: [],
  },
  {
    id: 802,
    artistId: SHOWCASE_ARTIST.id,
    artist: SHOWCASE_ARTIST,
    name: "Tide Pool",
    description:
      "Every new release as a download, plus demos and voice memos from the boathouse.",
    minAmount: 500,
    interval: "MONTH",
    isDefaultTier: false,
    platformPercent: 7,
    digitalDiscountPercent: 100,
    images: [tierImage("tier-tidepool.svg")],
  },
  {
    id: 803,
    artistId: SHOWCASE_ARTIST.id,
    artist: SHOWCASE_ARTIST,
    name: "Lighthouse Keeper",
    description:
      "Everything in Tide Pool, a signed copy of every vinyl pressing, and your name in the liner notes.",
    minAmount: 1500,
    interval: "MONTH",
    isDefaultTier: false,
    platformPercent: 7,
    digitalDiscountPercent: 100,
    merchDiscountPercent: 20,
    images: [tierImage("tier-lighthouse.svg")],
  },
];

export const TOUR_DATES: NonNullable<Artist["tourDates"]> = [
  ["2026-10-09", "The Carleton, Halifax NS"],
  ["2026-10-11", "Le Ministère, Montréal QC"],
  ["2026-10-14", "The Garrison, Toronto ON"],
  ["2026-10-17", "Union Pool, Brooklyn NY"],
  ["2026-10-22", "The Sinclair, Cambridge MA"],
  ["2026-11-03", "Café OTO, London UK"],
].map(([date, location]) => ({
  date: `${date}T20:00:00Z`,
  location,
  ticketsUrl: "https://tickets.lumentide.ca",
}));

export const LINKS: Link[] = [
  { url: "https://lumentide.ca", linkLabel: "lumentide.ca", inHeader: true },
  {
    url: "https://instagram.com/lumentide",
    linkLabel: "Instagram",
    inHeader: true,
  },
  {
    url: "https://mastodon.social/@lumentide",
    linkLabel: "Mastodon",
    inHeader: true,
  },
  {
    url: "https://youtube.com/@lumentide",
    linkLabel: "YouTube",
    inHeader: true,
  },
];

/**
 * A page background. The page reads the 2500px size and the image uploader
 * the 625px one, which the shared fixture's banner doesn't include.
 */
export const banner = (file: string): NonNullable<Artist["background"]> => {
  const url = `/showcase/${file}`;
  return {
    url,
    updatedAt: "2026-09-01T00:00:00Z",
    sizes: { 625: url, 1200: url, 1500: url, 2500: url, original: url },
  };
};

/** Lumen Tide with every section of the artist page filled in. */
export const FULL_ARTIST: Artist = {
  ...SHOWCASE_ARTIST_WITH_RELEASES,
  user: FULL_ARTIST_USER,
  // The shared fixture releases have no publishedAt, which hides the buy
  // button.
  trackGroups: [
    TIDAL_HOURS,
    ...[RELEASES.moss, RELEASES.ember, RELEASES.dusk].map((tg) => ({
      ...tg,
      publishedAt: tg.releaseDate,
    })),
  ],
  announcementText:
    "**Autumn tour starts October 9 in Halifax** — the new vinyl will be at every show.",
  tourDates: TOUR_DATES,
  linksJson: LINKS,
  merch: MERCH,
  posts: POSTS,
  subscriptionTiers: TIERS,
  artistLocationTags: [],
  background: banner("banner.svg"),
  properties: { ...SHOWCASE_ARTIST.properties, releasesPerRow: 4 },
};

// --- Colour themes -----------------------------------------------------

export const THEMES = {
  /** The fixture default: warm paper with sea-blue buttons */
  tide: SHOWCASE_ARTIST.properties!.colors!,
  /** A dark, warm theme for the "Ember Rooms" era */
  ember: {
    background: "#1a0f0c",
    text: "#f6e7d0",
    button: "#e0592a",
    buttonText: "#1a0f0c",
  },
  /** A soft green theme for the "Moss Choir" era */
  moss: {
    background: "#e7eedf",
    text: "#1f3324",
    button: "#4f7a3a",
    buttonText: "#ffffff",
  },
} satisfies Record<string, ArtistColors>;

export const withTheme = (
  artist: Artist,
  colors: ArtistColors,
  {
    background,
    ...extra
  }: Partial<NonNullable<Artist["properties"]>> & {
    background?: Artist["background"];
  } = {}
): Artist => ({
  ...artist,
  background: background ?? artist.background,
  properties: { ...artist.properties, colors, ...extra },
});

// --- Handlers ----------------------------------------------------------

/** Everything the public artist page and its tabs request. */
export const publicArtistHandlers = (artist: Artist | (() => Artist)) => {
  const current = typeof artist === "function" ? artist : () => artist;
  return [
    http.get("*/v1/artists/:artistSlug/posts", () =>
      HttpResponse.json({ results: current().posts, total: POSTS.length })
    ),
    http.get("*/v1/artists/:artistSlug/supporters/", () =>
      HttpResponse.json({ results: [], total: 0 })
    ),
    http.get("*/v1/artists/:artistSlug", () =>
      HttpResponse.json({ result: current() })
    ),
    http.get("*/v1/merch/:merchId", ({ params }) =>
      HttpResponse.json({
        result: MERCH.find((m) => m.id === params.merchId) ?? MERCH[0],
      })
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
    http.get("*/v1/trackGroups/:trackGroupId/recommendedTrackGroups", () =>
      HttpResponse.json({ results: [RELEASES.moss, RELEASES.ember] })
    ),
    http.get("*/v1/trackGroups/:trackGroupId/", ({ params }) => {
      const found = current().trackGroups.find(
        (tg) =>
          tg.urlSlug === params.trackGroupId ||
          String(tg.id) === params.trackGroupId
      );
      return HttpResponse.json({
        result: { ...(found ?? TIDAL_HOURS), artist: current() },
      });
    }),
    http.get("*/v1/labels/:labelSlug/trackGroups", () =>
      HttpResponse.json({ results: [] })
    ),
    http.get("*/v1/artists/:artistId/purchaseCatalogue", () =>
      HttpResponse.json({ result: { price: null } })
    ),
    http.get("*/v1/settings/instanceArtist", () =>
      HttpResponse.json({ result: null })
    ),
  ];
};

export const paymentsEnabled = stripeStatusHandlers({ chargesEnabled: true });
