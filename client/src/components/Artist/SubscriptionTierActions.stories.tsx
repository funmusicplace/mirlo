import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
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
  YEARLY_TIER,
  subscribedFan,
} from "../../showcase/subscriptions/subscriptionsFixtures";

import SubscriptionTierActions from "./SubscriptionTierActions";

const ARTIST: Artist = {
  ...ARTIST_WITH_TIERS,
  user: { id: SHOWCASE_ARTIST.userId, currency: "usd" },
};

let switchTierRequests: { subscriptionId: unknown; body: unknown }[] = [];

/**
 * The buttons on a subscription tier's card or page: subscribe, switch to
 * this tier, cancel, or change the card. Switching asks first; a tier that
 * collects an address the subscriber hasn't given opens the payment modal.
 */
const meta = {
  title: "Features/Billing/SubscriptionTierActions",
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
 * Subscribed to a cheaper tier: asks before switching, says the difference
 * is billed today, then moves the subscription without a new checkout
 */
export const SwitchToAnotherTier: Story = {
  parameters: {
    msw: {
      handlers: {
        switchTier: http.put(
          "*/v1/manage/subscriptions/:subscriptionId/tier",
          async ({ request, params }) => {
            switchTierRequests.push({
              subscriptionId: params.subscriptionId,
              body: await request.json(),
            });
            return HttpResponse.json({ result: {} });
          }
        ),
      },
    },
  },
  beforeEach: () => {
    switchTierRequests = [];
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: "Choose this subscription",
      })
    );
    const body = within(document.body);
    await expect(
      await body.findByText(
        "You'll be charged the difference for the rest of this billing period today, then the new price from your next billing date."
      )
    ).toBeInTheDocument();
    await userEvent.click(await body.findByRole("button", { name: "Switch" }));
    await waitFor(() =>
      expect(switchTierRequests).toEqual([
        { subscriptionId: "9001", body: { tierId: LIGHTHOUSE_TIER.id } },
      ])
    );
  },
};

/** Switching from monthly to yearly warns that it's billed straight away */
export const SwitchToYearlyTier: Story = {
  args: { subscriptionTier: YEARLY_TIER },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: "Choose this subscription",
      })
    );
    await expect(
      await within(document.body).findByText(/you'll be charged today/)
    ).toBeInTheDocument();
  },
};

/**
 * Subscribed to another tier: switching to one that needs an address opens
 * the payment modal with an address form
 */
export const SwitchToTierWithAddress: Story = {
  args: { subscriptionTier: { ...LIGHTHOUSE_TIER, collectAddress: true } },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: "Choose this subscription",
      })
    );
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Switch" }));
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
