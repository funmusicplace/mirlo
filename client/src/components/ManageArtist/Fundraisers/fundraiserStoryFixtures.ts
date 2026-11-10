import { http, HttpResponse } from "msw";

import { ARTIST_EXAMPLE } from "../../../../test/mocks";

export const ARTIST: Artist = {
  ...ARTIST_EXAMPLE,
  name: "The Tidal Hours",
  urlSlug: "tidal-hours",
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
  goalAmount: 800000,
  isAllOrNothing: true,
  amountRaised: 0,
  pledgeCount: 0,
};

export const STUDIO: FundraiserSummary = {
  ...base,
  id: 3,
  name: "Studio time for the next record",
  goalAmount: 200000,
  isAllOrNothing: false,
  status: "SUCCESSFUL",
  amountRaised: 241000,
  pledgeCount: 0,
};

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
