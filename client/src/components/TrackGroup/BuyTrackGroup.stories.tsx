import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";

import { stripeStatusHandlers } from "../../../.storybook/handlers";
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
        purchase: [
          http.get("*/v1/trackGroups/:slug/testOwns", () =>
            HttpResponse.json({ result: { exists: false } })
          ),
          // Checkout hands off to Stripe, which can't run here: leave the
          // button spinning instead of erroring if it's clicked.
          http.post("*/v1/purchase", async () => {
            await delay("infinite");
            return HttpResponse.json({});
          }),
        ],
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
