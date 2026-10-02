import type { Meta, StoryObj } from "@storybook/react";
import { fn, userEvent, within } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";

import { stripeStatusHandlers } from "../../../.storybook/handlers";
import { RELEASES } from "../../showcase/shared/fixtures";
import { authAs } from "../../showcase/shared/helpers";

import BuyTrackModal from "./BuyTrackModal";

const RELEASE = RELEASES.tidal;

/**
 * What the player shows once a listener has used up their free plays of a
 * track: an explanation with "Go back to Mirlo" and "Buy". Buy swaps in the
 * pay-what-you-want form for the album.
 */
const meta = {
  title: "Player/BuyTrackModal",
  component: BuyTrackModal,
  args: {
    showBuyModal: true,
    setShowBuyModal: fn(),
    trackGroupId: RELEASE.id,
  },
  parameters: {
    layout: "centered",
    msw: {
      handlers: {
        auth: authAs(null),
        stripe: stripeStatusHandlers({ chargesEnabled: true }),
        release: ["*/v1/trackGroups/:id/", "*/v1/trackGroups/:id"].map((path) =>
          http.get(path, () => HttpResponse.json({ result: RELEASE }))
        ),
        // Checkout hands off to Stripe, which can't run here
        purchase: [
          http.post("*/v1/purchase", async () => {
            await delay("infinite");
            return HttpResponse.json({});
          }),
        ],
      },
    },
  },
} satisfies Meta<typeof BuyTrackModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The play-limit explanation, before choosing to buy */
export const PlayLimitReached: Story = {
  play: async () => {
    // The modal renders in a portal outside the canvas
    await within(document.body).findByRole(
      "button",
      { name: "Buy" },
      { timeout: 5000 }
    );
  },
};

/** After clicking Buy: the album's pay-what-you-want form, from $7 */
export const BuyForm: Story = {
  play: async () => {
    const body = within(document.body);
    await userEvent.click(
      await body.findByRole("button", { name: "Buy" }, { timeout: 5000 })
    );
    await body.findByLabelText(/name your price/i, undefined, {
      timeout: 5000,
    });
  },
};
