import { ARTIST_EXAMPLE } from "./artist";

const image = (src: string): MerchImage => ({
  id: src,
  merchId: "8b0d5a6e-0000-4000-8000-000000000001",
  imageId: null,
  position: 0,
  url: [src],
  updatedAt: "1999-09-09T09:09:09Z",
  sizes: { 60: src, 120: src, 960: src },
});

export const MERCH_EXAMPLE: Merch = {
  id: "8b0d5a6e-0000-4000-8000-000000000001",
  artistId: ARTIST_EXAMPLE.id,
  artist: ARTIST_EXAMPLE,
  title: "Example T-Shirt",
  description: "",
  catalogNumber: "MIR-001",
  minPrice: 2000,
  currency: "usd",
  urlSlug: "example-t-shirt",
  quantityRemaining: 50,
  isPublic: true,
  images: [image("/android-chrome-192x192.png")],
  shippingDestinations: [],
  order: 0,
};

/** Unpublished and without an image or catalog number, as a freshly created item is. */
export const DRAFT_MERCH_EXAMPLE: Merch = {
  ...MERCH_EXAMPLE,
  id: "8b0d5a6e-0000-4000-8000-000000000002",
  title: "Tour Poster",
  catalogNumber: undefined,
  urlSlug: null,
  isPublic: false,
  images: [],
  order: 1,
};

const VINYL_MERCH_ID = "8b0d5a6e-0000-4000-8000-000000000004";

/** A processed merch image backed by one of Storybook's /showcase assets. */
export const merchImageFixture = (
  file: string,
  position: number,
  merchId: string = VINYL_MERCH_ID
): MerchImage => {
  const src = `/showcase/${file}`;
  return {
    id: `merch-image-${position}-${file}`,
    merchId,
    imageId: `image-${position}-${file}`,
    position,
    url: [src],
    updatedAt: "2026-09-01T00:00:00Z",
    sizes: { 60: src, 120: src, 300: src, 600: src, 960: src, 1200: src },
  };
};

/** A record with several photos: the sleeve, the insert, a poster and a tote. */
export const VINYL_MERCH_EXAMPLE: Merch = {
  ...MERCH_EXAMPLE,
  id: VINYL_MERCH_ID,
  title: "Tidal Hours on 12-inch Vinyl",
  catalogNumber: "MIR-003-LP",
  urlSlug: "tidal-hours-vinyl",
  images: [
    merchImageFixture("merch-vinyl.svg", 0),
    merchImageFixture("fees-merch-vinyl.svg", 1),
    merchImageFixture("merch-poster.svg", 2),
    merchImageFixture("merch-tote.svg", 3),
  ],
  order: 3,
};
