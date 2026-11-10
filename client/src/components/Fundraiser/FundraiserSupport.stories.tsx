import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import {
  ARTIST,
  PUBLIC_VINYL,
} from "components/ManageArtist/Fundraisers/fundraiserStoryFixtures";
import { http, HttpResponse } from "msw";

import {
  artistHandlers,
  stripeStatusHandlers,
} from "../../../.storybook/handlers";
import {
  purchaseHandler,
  purchaseMock,
  setupQuote,
} from "../../../.storybook/purchaseHandlers";
import { stripeMock } from "../../../.storybook/stripeMock";
import { USER_EXAMPLE } from "../../../test/mocks";

import FundraiserSupport from "./FundraiserSupport";

/**
 * How a supporter backs a fundraiser on its public page: a Pledge button
 * that opens the pledge form for all-or-nothing fundraisers, a tip button for
 * the others.
 */
const meta = {
  title: "Features/Fundraisers/FundraiserSupport",
  component: FundraiserSupport,
  parameters: {
    layout: "padded",
    msw: {
      handlers: {
        artist: artistHandlers(ARTIST),
        purchase: purchaseHandler(setupQuote({ artistName: ARTIST.name })),
      },
    },
  },
  args: { fundraiser: PUBLIC_VINYL },
} satisfies Meta<typeof FundraiserSupport>;

export default meta;
type Story = StoryObj<typeof meta>;

const openPledgeForm = async (canvasElement: HTMLElement) => {
  await userEvent.click(
    await within(canvasElement).findByRole("button", { name: "Pledge" })
  );
  return within(
    await within(document.body).findByRole("dialog", {
      name: PUBLIC_VINYL.name,
    })
  );
};

/** Pledging the minimum, then adding a card that's only charged later */
export const Pledge: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modal = await openPledgeForm(canvasElement);
    await expect(modal.getByText("Still $1,875.00 to go")).toBeInTheDocument();
    await userEvent.click(
      await modal.findByLabelText(/my payment method will be stored/)
    );
    await userEvent.click(
      modal.getByRole("button", { name: "Add payment information" })
    );
    await waitFor(() =>
      expect(purchaseMock.bodies[0]).toMatchObject({
        artistId: ARTIST.id,
        items: [
          {
            type: "fundraiserPledge",
            fundraiserId: PUBLIC_VINYL.id,
            price: "2500",
          },
        ],
        deferred: true,
      })
    );
    await userEvent.click(
      await modal.findByRole("button", { name: "Complete payment" })
    );
    await waitFor(() => expect(stripeMock.confirmed).toHaveLength(1));
    await expect(
      await canvas.findByText(/Thanks for your pledge/)
    ).toBeInTheDocument();
  },
};

export const BelowTheMinimum: Story = {
  play: async ({ canvasElement }) => {
    const modal = await openPledgeForm(canvasElement);
    const amount = await modal.findByRole("spinbutton");
    await userEvent.clear(amount);
    await userEvent.type(amount, "5");
    await expect(
      await modal.findByText(/has set a mimimum price of \$25\.00/)
    ).toBeInTheDocument();
  },
};

export const AlreadyPledged: Story = {
  parameters: {
    msw: {
      handlers: {
        auth: http.get("*/auth/profile", () =>
          HttpResponse.json({
            result: {
              ...USER_EXAMPLE,
              pledges: [
                {
                  fundraiserId: PUBLIC_VINYL.id,
                  amount: 4000,
                  fundraiser: { goalAmount: 500000, isAllOrNothing: true },
                },
              ],
            },
          })
        ),
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(/You've pledged \$40\.00/)
    ).toBeInTheDocument();
  },
};

/** Contributions to other fundraisers go to the artist as tips */
export const NotAllOrNothing: Story = {
  args: { fundraiser: { ...PUBLIC_VINYL, isAllOrNothing: false } },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("button", { name: "Tip" })
    ).toBeInTheDocument();
  },
};

export const Ended: Story = {
  args: { fundraiser: { ...PUBLIC_VINYL, status: "SUCCESSFUL" } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("This fundraiser has ended.")
    ).toBeInTheDocument();
  },
};

export const ArtistNotSetUp: Story = {
  parameters: {
    msw: {
      handlers: { stripe: stripeStatusHandlers({ chargesEnabled: false }) },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(/hasn't set up payments yet/)
    ).toBeInTheDocument();
  },
};
