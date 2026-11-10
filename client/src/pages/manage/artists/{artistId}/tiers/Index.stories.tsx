import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import {
  ARTIST,
  STUDIO,
  VAN,
  VINYL,
} from "components/ManageArtist/Fundraisers/fundraiserStoryFixtures";
import { http, HttpResponse } from "msw";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { artistHandlers } from "../../../../../../.storybook/handlers";

import SupportTab from "./Index";

const tier = (id: number, name: string, minAmount: number) =>
  ({
    id,
    artistId: ARTIST.id,
    name,
    minAmount,
    description: "",
    interval: "MONTH",
    isDefaultTier: false,
    platformPercent: 7,
    images: [],
  }) as unknown as ArtistSubscriptionTier;

const TIERS = [tier(1, "Supporter", 500), tier(2, "Patron", 1500)];

const supportHandlers = (fundraisers: FundraiserSummary[]) => [
  http.get("*/v1/manage/artists/:artistId/subscriptionTiers", () =>
    HttpResponse.json({ results: TIERS })
  ),
  http.get("*/v1/manage/artists/:artistId/fundraisers", () =>
    HttpResponse.json({ results: fundraisers })
  ),
  http.get("*/v1/manage/artists/:artistId/subscriptionPayouts", () =>
    HttpResponse.json({ result: { paidSubscriptions: 0, onOtherAccounts: 0 } })
  ),
];

/**
 * The Support tab of artist management: the artist's fundraisers sit above
 * their subscription tiers.
 */
const meta = {
  title: "Features/Artist management/Support",
  component: SupportTab,
  parameters: {
    layout: "padded",
    msw: {
      handlers: {
        artist: artistHandlers(ARTIST),
        support: supportHandlers([VINYL, VAN, STUDIO]),
      },
    },
    reactRouter: reactRouterParameters({
      location: { pathParams: { artistId: String(ARTIST.id) } },
      routing: { path: "/manage/artists/:artistId/tiers" },
    }),
  },
} satisfies Meta<typeof SupportTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithFundraisers: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Fundraisers" })
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Add fundraiser" })
    ).toBeInTheDocument();
  },
};

/** No fundraisers yet: only the "Add fundraiser" button hints at them */
export const NoFundraisers: Story = {
  parameters: { msw: { handlers: { support: supportHandlers([]) } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "Add fundraiser" });
    await expect(
      canvas.queryByRole("heading", { name: "Fundraisers" })
    ).not.toBeInTheDocument();
  },
};
