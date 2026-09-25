import { ARTIST_EXAMPLE } from "./artist";

const image = (src: string) => ({
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
