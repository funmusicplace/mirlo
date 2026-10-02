import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import SalesPage from "pages/sales/Index";
import type { Sale } from "queries";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { artistHandlers } from "../../../.storybook/handlers";
import {
  RELEASES,
  SHOWCASE_ARTIST,
  SHOWCASE_ARTIST_WITH_RELEASES,
} from "../shared/fixtures";
import { recordingViewport } from "../shared/helpers";

import { SHOWCASE_MERCH } from "./moneyFixtures";

const ARTIST_ON_SALE = {
  id: SHOWCASE_ARTIST.id,
  name: SHOWCASE_ARTIST.name,
  urlSlug: SHOWCASE_ARTIST.urlSlug ?? "lumen-tide",
};

const TIER = {
  ...({} as ArtistSubscriptionTier),
  id: 3,
  name: "Tidepool",
  interval: "MONTH" as const,
};

type Item =
  | { release: TrackGroup }
  | { merch: Merch }
  | { tier: true }
  | { tip: true };

/**
 * A sale as the API reports it: Stripe takes 2.9% + 30c, and Mirlo takes
 * whatever cut the artist chose (0% on everything after they changed it).
 */
const sale = (
  n: number,
  date: string,
  amount: number,
  platformPercent: number,
  item: Item
): Sale => {
  const base: Sale = {
    id: `sale-${n}`,
    userFriendlyId: `LT-${String(4200 + n)}`,
    amount,
    currency: "usd",
    datePurchased: date,
    artist: [ARTIST_ON_SALE],
    platformCut: Math.round((amount * platformPercent) / 100),
    paymentProcessorCut: Math.round(amount * 0.029 + 30),
  };
  if ("release" in item) {
    return {
      ...base,
      trackGroupPurchases: [
        {
          message: "",
          trackGroupId: item.release.id,
          trackGroup: item.release,
        },
      ],
    };
  }
  if ("merch" in item) {
    return {
      ...base,
      merchPurchases: [{ message: "", merchId: n, merch: item.merch }],
    };
  }
  if ("tier" in item) {
    return {
      ...base,
      artistUserSubscriptionCharges: [
        {
          artistUserSubscription: {
            ...({} as ArtistUserSubscription),
            artistSubscriptionTier: TIER,
          },
        },
      ],
    };
  }
  return base;
};

const [vinyl, cassette, tee, tote] = SHOWCASE_MERCH;

const SALES: Sale[] = [
  sale(18, "2026-09-30T18:12:00Z", 1500, 0, { release: RELEASES.tidal }),
  sale(17, "2026-09-30T09:40:00Z", 2800, 0, { merch: vinyl }),
  sale(16, "2026-09-29T21:05:00Z", 1000, 0, { release: RELEASES.tidal }),
  sale(15, "2026-09-29T14:22:00Z", 500, 0, { tier: true }),
  sale(14, "2026-09-28T19:47:00Z", 2500, 0, { merch: tee }),
  sale(13, "2026-09-28T11:03:00Z", 700, 0, { release: RELEASES.ember }),
  sale(12, "2026-09-27T16:30:00Z", 2000, 0, { tip: true }),
  sale(11, "2026-09-26T08:15:00Z", 1000, 7, { merch: cassette }),
  sale(10, "2026-09-25T20:58:00Z", 1200, 7, { release: RELEASES.moss }),
  sale(9, "2026-09-25T13:44:00Z", 1800, 7, { merch: tote }),
  sale(8, "2026-09-24T17:20:00Z", 500, 7, { tier: true }),
  sale(7, "2026-09-23T10:09:00Z", 300, 7, { release: RELEASES.dusk }),
];

const salesHandlers = [
  http.get("*/v1/manage/sales", () =>
    HttpResponse.json({
      results: SALES,
      total: SALES.length,
      totalAmount: SALES.reduce((sum, s) => sum + s.amount, 0),
      totalSupporters: 11,
    })
  ),
  http.post("*/v1/manage/sales/:saleId/resendReceipt", () =>
    HttpResponse.json({ result: { sentTo: "maya.okafor@fastmail.com" } })
  ),
];

/**
 * The artist's sales at /sales: each row shows the price, Mirlo's cut and
 * Stripe's cut separately. The newest sales came in after the artist set
 * their cut to 0%, so Mirlo's column reads $0.00 there.
 */
const meta = {
  title: "Showcase/Sales and fees",
  component: SalesPage,
  parameters: {
    layout: "padded",
    ...recordingViewport,
    msw: {
      handlers: {
        artist: artistHandlers(SHOWCASE_ARTIST_WITH_RELEASES),
        sales: salesHandlers,
      },
    },
    reactRouter: reactRouterParameters({ routing: { path: "/sales" } }),
  },
} satisfies Meta<typeof SalesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Clean start: pan down the "Platform cut" column ($0.00 since the switch to
 * 0%, 7% before) next to "Payment processor cut".
 */
export const Default: Story = {};
