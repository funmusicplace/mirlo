import { http, HttpResponse } from "msw";

import { ARTIST_EXAMPLE } from "../../../../test/mocks";

export const ARTIST: Artist = {
  ...ARTIST_EXAMPLE,
  name: "The Tidal Hours",
  urlSlug: "tidal-hours",
  defaultPlatformFee: 10,
  user: { ...ARTIST_EXAMPLE.user, currency: "usd" } as Artist["user"],
};

const base = {
  description: "",
  endDate: "",
  minPledge: 0,
  status: "ACTIVE" as const,
  trackGroups: [],
};

export const VINYL: FundraiserSummary = {
  ...base,
  id: 1,
  name: "Press Tidal Hours on vinyl",
  urlSlug: "vinyl",
  description:
    "Help us press 300 copies on sea-glass blue vinyl. You're only charged if we hit the goal.",
  goalAmount: 500000,
  minPledge: 2500,
  endDate: "2026-12-31T23:59:59.000Z",
  isAllOrNothing: true,
  amountRaised: 312500,
  pledgeCount: 87,
  trackGroups: [{ id: 4, title: "Tidal Hours" }],
};

export const VAN: FundraiserSummary = {
  ...base,
  id: 2,
  name: "A van for the autumn tour",
  urlSlug: "a-van",
  goalAmount: 800000,
  isAllOrNothing: true,
  amountRaised: 0,
  pledgeCount: 0,
};

export const FUNDRAISER_VIDEO = {
  videoUrl: "https://youtu.be/aqz-KE-bpKQ",
  videoEmbedUrl: "https://www.youtube.com/embed/aqz-KE-bpKQ",
};

export const STUDIO: FundraiserSummary = {
  ...base,
  id: 3,
  name: "Studio time for the next record",
  urlSlug: "studio-time",
  goalAmount: 200000,
  isAllOrNothing: false,
  status: "SUCCESSFUL",
  amountRaised: 241000,
  pledgeCount: 0,
};

export const fundraiserImageFixture = (
  file: string,
  position: number,
  fundraiserId: number = VINYL.id
): FundraiserImage => {
  const src = `/showcase/${file}`;
  return {
    id: `fundraiser-image-${position}-${file}`,
    fundraiserId,
    imageId: `image-${position}-${file}`,
    position,
    url: [src],
    sizes: { 60: src, 120: src, 300: src, 600: src, 960: src, 1200: src },
  };
};

export const VINYL_IMAGES = [
  fundraiserImageFixture("merch-vinyl.svg", 0),
  fundraiserImageFixture("cover-tidal.svg", 1),
  fundraiserImageFixture("fees-merch-vinyl.svg", 2),
];

export const asManaged = (fundraiser: FundraiserSummary): ManagedFundraiser =>
  fundraiser as unknown as ManagedFundraiser;

/** The endpoints a fundraiser's actions and edit form call */
export const fundraiserMutationHandlers = [
  http.put("*/v1/manage/fundraisers/:fundraiserId", async ({ request }) =>
    HttpResponse.json({ result: await request.json() })
  ),
  http.post("*/v1/manage/fundraisers/:fundraiserId/chargePledges", () =>
    HttpResponse.json({ message: "Success" })
  ),
  http.delete("*/v1/manage/fundraisers/:fundraiserId", () =>
    HttpResponse.json({ message: "Success" })
  ),
];

/** VINYL as the public fundraiser page receives it */
export const PUBLIC_VINYL: PublicFundraiser = {
  ...VINYL,
  ...FUNDRAISER_VIDEO,
  urlSlug: "vinyl",
  isPublic: true,
  description:
    "<p>Help us press 300 copies on <strong>sea-glass blue vinyl</strong>. You're only charged if we hit the goal.</p>" +
    "<p>We recorded Tidal Hours over two winters in a converted boathouse, with the tape machine running off a borrowed generator. The songs grew out of long nights listening to the tide come in, and we've always heard them as a record you flip over halfway through.</p>" +
    "<p>The money covers mastering for vinyl, lacquers, the pressing itself and printed sleeves designed by our friend Ana. Anything over the goal goes towards a small run of test pressings for the people who backed us first.</p>" +
    "<p>If we reach the goal, records ship in the spring. Every backer also gets the digital album straight away, and we'll post updates here as each step of the pressing is done.</p>",
  images: VINYL_IMAGES,
  trackGroups: [
    { id: 4, title: "Tidal Hours", urlSlug: "tidal-hours", platformPercent: 7 },
  ],
  artist: {
    id: ARTIST.id,
    name: ARTIST.name,
    urlSlug: ARTIST.urlSlug,
    userId: ARTIST.userId,
    defaultPlatformFee: 10,
    user: { currency: "usd" },
  },
};

export const publicFundraiserHandler = (fundraiser: PublicFundraiser) =>
  http.get("*/v1/fundraisers/:fundraiserId", () =>
    HttpResponse.json({ result: fundraiser })
  );
