import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";

import {
  paymentQuote,
  purchaseHandler,
  purchaseMock,
} from "../../../.storybook/purchaseHandlers";
import { SHOWCASE_ARTIST } from "../../showcase/shared/fixtures";

import PurchaseCatalogueButton from "./PurchaseCatalogueButton";

const ARTIST: Artist = {
  ...SHOWCASE_ARTIST,
  user: { id: SHOWCASE_ARTIST.userId, currency: "usd" },
  purchaseEntireCatalogEnabled: true,
};

/**
 * "Purchase entire catalogue" on an artist's releases page. Clicking it
 * quotes the catalogue at its floor price and opens the payment modal;
 * nothing is charged or created with Stripe until the buyer pays.
 */
const meta = {
  title: "Artist/PurchaseCatalogueButton",
  component: PurchaseCatalogueButton,
  args: { artist: ARTIST },
  parameters: {
    layout: "centered",
    msw: {
      handlers: {
        catalogue: http.get("*/v1/artists/:artistId/purchaseCatalogue", () =>
          HttpResponse.json({ result: { price: 2400 } })
        ),
        purchase: purchaseHandler(paymentQuote({ amount: 2400 })),
      },
    },
  },
} satisfies Meta<typeof PurchaseCatalogueButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Clicking quotes the catalogue and opens the payment modal */
export const OpensCheckout: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /Purchase entire catalogue/ })
    );
    await expect(
      await within(document.body).findByRole("button", {
        name: "Complete payment",
      })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(purchaseMock.bodies).toEqual([
        {
          artistId: ARTIST.id,
          items: [{ type: "catalogue", price: "2400" }],
          deferred: true,
        },
      ])
    );
  },
};
