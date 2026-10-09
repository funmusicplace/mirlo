import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";

import { stripeStatusHandlers } from "../../../.storybook/handlers";
import {
  paymentQuote,
  purchaseHandler,
  purchaseMock,
  setupQuote,
} from "../../../.storybook/purchaseHandlers";
import { stripeMock } from "../../../.storybook/stripeMock";
import {
  makeFundraiser,
  fundraiserRelease,
} from "../../showcase/fundraisers/fundraiserFixtures";
import { RELEASES } from "../../showcase/shared/fixtures";
import { authAs } from "../../showcase/shared/helpers";

import BuyTrackGroup from "./BuyTrackGroup";

/** "Tidal Hours", with single tracks selling for $1.50 and up */
const RELEASE: TrackGroup = {
  ...RELEASES.tidal,
  tracks: RELEASES.tidal.tracks.map((track) => ({ ...track, minPrice: 150 })),
};

/** A listener account (not the artist) */
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

const waitForPriceInput = async () => {
  await expect(
    await within(document.body).findByLabelText(/name your price/i, undefined, {
      timeout: 5000,
    })
  ).toBeInTheDocument();
};

/**
 * The pay-what-you-want form for a release (or, with `track`, a single
 * track): the minimum price, a price input with +$ buttons that starts at
 * the suggested price, an optional comment and the Buy button. It's shown
 * in the buy modal on release and track pages.
 */
const meta = {
  title: "TrackGroup/BuyTrackGroup",
  component: BuyTrackGroup,
  args: { trackGroup: RELEASE },
  decorators: [
    (Story) => (
      <div className="w-[32rem] max-w-full">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    msw: {
      handlers: {
        auth: authAs(LISTENER),
        stripe: stripeStatusHandlers({ chargesEnabled: true }),
        testOwns: http.get("*/v1/trackGroups/:slug/testOwns", () =>
          HttpResponse.json({ result: { exists: false } })
        ),
        // Stories that stop at the form never reach checkout: leave the
        // button spinning instead of erroring if it's clicked.
        purchase: http.post("*/v1/purchase", async () => {
          await delay("infinite");
          return HttpResponse.json({});
        }),
      },
    },
  },
} satisfies Meta<typeof BuyTrackGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Logged in: $7 minimum, starting at the $10 suggested price */
export const PayWhatYouWant: Story = {
  play: waitForPriceInput,
};

/**
 * A logged-out visitor: no account needed to pay, Stripe checkout collects
 * their email.
 */
export const LoggedOut: Story = {
  parameters: { msw: { handlers: { auth: authAs(null) } } },
  play: waitForPriceInput,
};

/** Buying a single track ("Harbour Lights"), starting at its $1.50 minimum */
export const SingleTrack: Story = {
  args: { track: RELEASE.tracks[1] },
  play: waitForPriceInput,
};

/** The artist hasn't connected a payment account yet, so nothing is for sale */
export const ArtistNotSetUp: Story = {
  parameters: {
    msw: {
      handlers: { stripe: stripeStatusHandlers({ chargesEnabled: false }) },
    },
  },
};

/**
 * Clicking Buy quotes the price and swaps in the payment form; the intent
 * is created only when the buyer pays (Stripe is a local stand-in here)
 */
export const Checkout: Story = {
  parameters: {
    msw: { handlers: { purchase: purchaseHandler(paymentQuote()) } },
  },
  play: async ({ canvasElement }) => {
    await waitForPriceInput();
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Buy" }));
    await userEvent.click(
      await canvas.findByRole("button", { name: "Complete payment" })
    );
    await waitFor(() => expect(stripeMock.confirmed).toHaveLength(1));
    await expect(purchaseMock.bodies).toHaveLength(2);
    await expect(purchaseMock.bodies[0]).toEqual(
      expect.objectContaining({ deferred: true })
    );
  },
};

const FUNDRAISER = makeFundraiser({ daysLeft: 21 });

/**
 * Backing an all-or-nothing fundraiser: the buyer consents to the card
 * being stored, and it's only charged if the goal is reached — so this is
 * a SetupIntent, not a payment
 */
export const Pledge: Story = {
  args: { trackGroup: fundraiserRelease(FUNDRAISER) },
  parameters: {
    msw: { handlers: { purchase: purchaseHandler(setupQuote()) } },
  },
  play: async ({ canvasElement }) => {
    await waitForPriceInput();
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByLabelText(/payment method will be stored/)
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Add payment information" })
    );
    await userEvent.click(
      await canvas.findByRole("button", { name: "Complete payment" })
    );
    await waitFor(() =>
      expect(stripeMock.confirmed).toEqual([
        {
          method: "setup",
          clientSecret: "seti_checkout_storybook_secret_storybook",
        },
      ])
    );
    await expect(purchaseMock.bodies[0]).toEqual(
      expect.objectContaining({
        deferred: true,
        items: [
          expect.objectContaining({
            type: "fundraiserPledge",
            fundraiserId: FUNDRAISER.id,
          }),
        ],
      })
    );
  },
};

/**
 * A logged-out backer verifies their email before any card details: the
 * pledge is charged later, so Mirlo needs a reachable address for it
 */
export const PledgeLoggedOut: Story = {
  args: { trackGroup: fundraiserRelease(FUNDRAISER) },
  parameters: { msw: { handlers: { auth: authAs(null) } } },
  play: async ({ canvasElement }) => {
    await waitForPriceInput();
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("button", { name: /verify/i })
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Add payment information" })
    ).not.toBeInTheDocument();
  },
};
