import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { artistHandlers } from "../../../.storybook/handlers";
import {
  purchaseHandler,
  purchaseMock,
  setupQuote,
} from "../../../.storybook/purchaseHandlers";
import { SHOWCASE_ARTIST } from "../../showcase/shared/fixtures";
import { authAs } from "../../showcase/shared/helpers";
import {
  ARTIST_WITH_TIERS,
  FAN,
  LIGHTHOUSE_TIER,
  TIDE_POOL_TIER,
  subscribedFan,
} from "../../showcase/subscriptions/subscriptionsFixtures";

import SubscriptionTierActions from "./SubscriptionTierActions";

const ARTIST: Artist = {
  ...ARTIST_WITH_TIERS,
  user: { id: SHOWCASE_ARTIST.userId, currency: "usd" },
};

/**
 * The buttons on a subscription tier's card or page: subscribe, switch to
 * this tier, cancel, or change the card. Switching to a tier that collects
 * an address opens the payment modal for it.
 */
const meta = {
  title: "Artist/SubscriptionTierActions",
  component: SubscriptionTierActions,
  args: { subscriptionTier: LIGHTHOUSE_TIER },
  decorators: [
    (Story) => (
      <div className="w-[24rem] max-w-full">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    reactRouter: reactRouterParameters({
      location: { pathParams: { artistId: ARTIST.urlSlug ?? "" } },
      routing: { path: "/:artistId/support" },
    }),
    msw: {
      handlers: {
        auth: authAs(subscribedFan(TIDE_POOL_TIER)),
        artist: artistHandlers(ARTIST, { relationship: null }),
        purchase: purchaseHandler(setupQuote({ requiresShipping: true })),
      },
    },
  },
} satisfies Meta<typeof SubscriptionTierActions>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Subscribed to another tier: switching to one that needs an address opens
 * the payment modal with an address form
 */
export const SwitchToTierWithAddress: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: "Choose this subscription",
      })
    );
    const body = within(document.body);
    await expect(
      await body.findByTestId("address-element")
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(purchaseMock.bodies[0]).toEqual({
        artistId: ARTIST.id,
        items: [{ type: "subscription", tierId: LIGHTHOUSE_TIER.id }],
        deferred: true,
      })
    );
  },
};

/** Already on this tier: cancel and change-card controls */
export const Subscribed: Story = {
  args: { subscriptionTier: TIDE_POOL_TIER },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("button", {
        name: "Change payment method",
      })
    ).toBeInTheDocument();
  },
};

/** Not subscribed: the variable-amount support form */
export const NotSubscribed: Story = {
  parameters: { msw: { handlers: { auth: authAs(FAN) } } },
};
