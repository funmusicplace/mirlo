import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";

import {
  purchaseHandler,
  setupQuote,
} from "../../../.storybook/purchaseHandlers";
import { stripeMock } from "../../../.storybook/stripeMock";
import { ARTIST_EXAMPLE, USER_EXAMPLE } from "../../../test/mocks";

import SupportArtistTiersForm from "./SupportArtistTiersForm";

const tier = (
  overrides: Partial<ArtistSubscriptionTier>
): ArtistSubscriptionTier => ({
  id: 1,
  artistId: ARTIST_EXAMPLE.id,
  artist: ARTIST_EXAMPLE,
  name: "follow",
  description: "",
  interval: "MONTH",
  isDefaultTier: false,
  platformPercent: 7,
  images: [],
  ...overrides,
});

const FOLLOW_TIER = tier({ id: 1, name: "follow", isDefaultTier: true });
const SUPPORTER_TIER = tier({ id: 2, name: "Supporter", minAmount: 500 });
const SUPERFAN_TIER = tier({ id: 3, name: "Superfan", minAmount: 1500 });

const ARTIST: Artist = {
  ...ARTIST_EXAMPLE,
  urlSlug: "example-artist",
  user: { currency: "usd" } as Artist["user"],
  subscriptionTiers: [FOLLOW_TIER, SUPPORTER_TIER, SUPERFAN_TIER],
};

/** Records what the form sent to POST /v1/purchase so play tests can check it */
let lastPurchaseBody: unknown;

/** Keyed so a story can swap one of them without replacing the rest */
const handlersFor = (artist: Artist) => ({
  artist: http.get("*/v1/artists/:artistSlug", () =>
    HttpResponse.json({ result: artist })
  ),
  // An existing subscriber switching tiers is updated in place, no checkout
  purchase: http.post("*/v1/purchase", async ({ request }) => {
    lastPurchaseBody = await request.json();
    return HttpResponse.json({ success: true });
  }),
  follow: http.post("*/v1/artists/:artistId/follow", () =>
    HttpResponse.json({})
  ),
});

const loggedInAs = (user: LoggedInUser) =>
  http.get("*/auth/profile", () => HttpResponse.json({ result: user }));

/**
 * The tier picker in the support/follow pop-ups and the artist connect page.
 * Paid tiers go through POST /v1/purchase: a tier switch is applied to the
 * existing subscription in place, and new subscriptions open the payment form.
 */
const meta = {
  title: "Common/SupportArtistTiersForm",
  component: SupportArtistTiersForm,
  parameters: {
    layout: "padded",
    msw: { handlers: handlersFor(ARTIST) },
  },
  args: { artist: ARTIST },
  beforeEach: () => {
    lastPurchaseBody = undefined;
  },
} satisfies Meta<typeof SupportArtistTiersForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SwitchingTiers: Story = {
  parameters: {
    msw: {
      handlers: {
        auth: loggedInAs({
          ...USER_EXAMPLE,
          artistUserSubscriptions: [
            {
              id: 1,
              amount: 500,
              userId: USER_EXAMPLE.id,
              artistSubscriptionTierId: SUPPORTER_TIER.id,
              artistSubscriptionTier: SUPPORTER_TIER,
            },
          ],
        }),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText(/Superfan/));
    await userEvent.click(
      await canvas.findByRole("button", { name: /Continue with/ })
    );
    await waitFor(() =>
      expect(lastPurchaseBody).toEqual({
        artistId: ARTIST.id,
        items: [{ type: "subscription", tierId: SUPERFAN_TIER.id }],
        deferred: true,
      })
    );
  },
};

export const AlreadySubscribed: Story = {
  parameters: {
    msw: {
      handlers: {
        auth: loggedInAs({
          ...USER_EXAMPLE,
          artistUserSubscriptions: [
            {
              id: 1,
              amount: 500,
              userId: USER_EXAMPLE.id,
              artistSubscriptionTierId: SUPPORTER_TIER.id,
              artistSubscriptionTier: SUPPORTER_TIER,
            },
          ],
        }),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText(/Supporter/));
    await expect(
      await canvas.findByRole("button", {
        name: "You're already subscribed to this tier",
      })
    ).toBeDisabled();
  },
};

export const LoggedOut: Story = {
  parameters: {
    msw: {
      handlers: {
        auth: http.get(
          "*/auth/profile",
          () => new HttpResponse(null, { status: 401 })
        ),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("textbox")).toHaveAttribute(
      "type",
      "email"
    );
  },
};

export const SinglePaidTier: Story = {
  args: { excludeDefault: true },
  parameters: {
    msw: {
      handlers: {
        ...handlersFor({
          ...ARTIST,
          subscriptionTiers: [FOLLOW_TIER, SUPPORTER_TIER],
        }),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("button", { name: "Continue with $5.00/month" })
    ).toBeInTheDocument();
    await expect(canvas.queryByRole("radio")).not.toBeInTheDocument();
  },
};

/**
 * A first-time subscription: the tier is quoted, then the payment form
 * creates and confirms the SetupIntent when the buyer pays
 */
export const NewSubscription: Story = {
  parameters: {
    msw: {
      handlers: {
        auth: loggedInAs(USER_EXAMPLE),
        purchase: purchaseHandler(setupQuote()),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText(/Superfan/));
    await userEvent.click(
      await canvas.findByRole("button", { name: /Continue with/ })
    );
    await userEvent.click(
      await canvas.findByRole("button", { name: "Support this artist" })
    );
    await waitFor(() => expect(stripeMock.confirmed).toHaveLength(1));
  },
};
