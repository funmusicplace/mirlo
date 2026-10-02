import type { Meta, StoryObj } from "@storybook/react";
import { screen, userEvent, within } from "@storybook/test";

import { AppFrame, appRouting } from "../shared/AppFrame";
import { recordingViewport, authAs } from "../shared/helpers";

import {
  FULL_ARTIST,
  MERCH_TSHIRT,
  MERCH_VINYL,
  paymentsEnabled,
  publicArtistHandlers,
} from "./artistPageData";

const merchPath = (merch: Merch) => `/lumen-tide/merch/${merch.id}`;

/**
 * Lumen Tide's merch item pages: a t-shirt with sizes and colours, and a
 * vinyl LP with two pressings, both with per-country shipping rates and a
 * bundled album download.
 */
const meta = {
  title: "Showcase/Merch variants and shipping",
  component: AppFrame,
  parameters: {
    layout: "fullscreen",
    ...recordingViewport,
    msw: {
      handlers: {
        auth: authAs(null),
        stripe: paymentsEnabled,
        artist: publicArtistHandlers(FULL_ARTIST),
      },
    },
    reactRouter: appRouting(merchPath(MERCH_TSHIRT)),
  },
} satisfies Meta<typeof AppFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

const openBuyDialog = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  await userEvent.click(
    await canvas.findByRole("button", { name: /^Buy from/ })
  );
  return screen.findByRole("dialog");
};

/**
 * The t-shirt page. Record clicking "Buy from", then pick a size, a colour
 * and a shipping country and watch the total update.
 */
export const TShirtPage: Story = {};

/**
 * The t-shirt buy dialog with XXL (+$2), "Natural undyed" (+$3) and UK
 * shipping already chosen, so the price breakdown is filled in. Change the
 * country to show the shipping rate change.
 */
export const TShirtBuyDialog: Story = {
  play: async ({ canvasElement }) => {
    const dialog = within(await openBuyDialog(canvasElement));
    await userEvent.selectOptions(
      await dialog.findByLabelText("Size"),
      "tshirt-size-XXL"
    );
    await userEvent.selectOptions(
      dialog.getByLabelText("Colour"),
      "tshirt-colour-2"
    );
    await userEvent.selectOptions(
      dialog.getByLabelText(/shipping/i),
      `${MERCH_TSHIRT.id}-ship-2`
    );
  },
};

/** The vinyl LP page, with its gatefold photo and bundled album tracks. */
export const VinylPage: Story = {
  parameters: { reactRouter: appRouting(merchPath(MERCH_VINYL)) },
};

/** The vinyl buy dialog open, before choosing a pressing. */
export const VinylBuyDialog: Story = {
  parameters: { reactRouter: appRouting(merchPath(MERCH_VINYL)) },
  play: async ({ canvasElement }) => {
    await openBuyDialog(canvasElement);
  },
};
