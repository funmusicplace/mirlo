import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";

import {
  paymentQuote,
  purchaseHandler,
  purchaseMock,
} from "../../../.storybook/purchaseHandlers";
import { stripeMock } from "../../../.storybook/stripeMock";
import { ARTIST_EXAMPLE } from "../../../test/mocks";

import TipArtistForm from "./TipArtistForm";
import TipArtistModal from "./TipArtistModal";

const ARTIST: Artist = {
  ...ARTIST_EXAMPLE,
  urlSlug: "example-artist",
  user: { currency: "usd" } as Artist["user"],
};

/**
 * The one-off tip form, inline on the artist's connect page and in the tip
 * pop-up. A preset or "Other" amount opens the payment form for a tip.
 */
const meta = {
  title: "Common/TipArtistForm",
  component: TipArtistForm,
  parameters: {
    layout: "padded",
    msw: {
      handlers: {
        artist: http.get("*/v1/artists/:artistSlug", () =>
          HttpResponse.json({ result: ARTIST })
        ),
        purchase: purchaseHandler(paymentQuote({ amount: 1000 })),
      },
    },
  },
  args: { artist: ARTIST },
} satisfies Meta<typeof TipArtistForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PresetAmount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText("$10.00"));
    await userEvent.click(
      await canvas.findByRole("button", { name: "Tip $10.00 once" })
    );
    await waitFor(() =>
      expect(purchaseMock.bodies[0]).toEqual({
        artistId: ARTIST.id,
        items: [{ type: "tip", amount: 1000 }],
        deferred: true,
      })
    );
    await userEvent.click(
      await canvas.findByRole("button", { name: "Complete payment" })
    );
    await waitFor(() => expect(stripeMock.confirmed).toHaveLength(1));
  },
};

export const OtherAmount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText("Other"));
    await userEvent.type(await canvas.findByRole("spinbutton"), "12.50");
    await userEvent.click(
      await canvas.findByRole("button", { name: "Tip $12.50 once" })
    );
    await waitFor(() =>
      expect(purchaseMock.bodies[0]).toEqual({
        artistId: ARTIST.id,
        items: [{ type: "tip", amount: 1250 }],
        deferred: true,
      })
    );
  },
};

/**
 * The tip pop-up opened over the connect page, which already shows the form
 * inline (e.g. from the player's support button). Each form's amount box
 * should open in that form.
 */
export const OtherInModalOverInlineForm: Story = {
  render: (args) => (
    <>
      <TipArtistForm {...args} />
      <TipArtistModal artist={args.artist as Artist} open onClose={fn()} />
    </>
  ),
  play: async () => {
    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.click(await dialog.findByText("Other"));
    await expect(await dialog.findByRole("spinbutton")).toBeVisible();
  },
};
