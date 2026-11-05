import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { delay, http, HttpResponse } from "msw";

import {
  FULL_ARTIST,
  MERCH_TOTE,
  paymentsEnabled,
} from "../../showcase/artistPage/artistPageData";
import { authAs } from "../../showcase/shared/helpers";

import BuyMerchItem from "./BuyMerchItem";

const destination = (
  i: number,
  destinationCountry: string | null,
  costUnit: number
): ShippingDestination => ({
  id: `${MERCH_TOTE.id}-ship-${i}`,
  merchId: MERCH_TOTE.id,
  homeCountry: "CA",
  destinationCountry,
  costUnit,
  costExtraUnit: 300,
});

/** The $18 tote, with an EU-wide rate and its own rate for Germany */
const TOTE_WITH_EU_SHIPPING: Merch = {
  ...MERCH_TOTE,
  shippingDestinations: [
    destination(0, "CA", 500),
    destination(1, "DE", 700),
    destination(2, "EU", 1500),
    destination(3, null, 2200),
  ],
};

const chooseDestination = async (canvasElement: HTMLElement, value: string) => {
  const canvas = within(canvasElement);
  await userEvent.selectOptions(
    await canvas.findByLabelText(/shipping destination/i),
    value
  );
  return canvas;
};

/**
 * The merch buy form. An "EU" shipping rate is offered as a choice for each
 * EU country, except countries that have their own rate.
 */
const meta = {
  title: "Features/Buying/BuyMerchItem",
  component: BuyMerchItem,
  args: { merch: TOTE_WITH_EU_SHIPPING, artist: FULL_ARTIST },
  decorators: [
    (Story) => (
      <div className="w-[40rem] max-w-full">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    msw: {
      handlers: {
        auth: authAs(null),
        stripe: paymentsEnabled,
        purchase: http.post("*/v1/purchase", async () => {
          await delay("infinite");
          return HttpResponse.json({});
        }),
      },
    },
  },
} satisfies Meta<typeof BuyMerchItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Shipping to France uses the EU rate: $18 + $15 shipping. The merch's own
 * list of destinations is left as it was.
 */
export const EUCountry: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = await chooseDestination(canvasElement, "FR");
    await expect(canvas.getByText(/Order total: \$33\.00/)).toBeVisible();
    await expect(
      canvas.getByRole("option", { name: /Ireland \(IE\)/ })
    ).toBeInTheDocument();
    await expect(
      args.merch.shippingDestinations.map((d) => d.destinationCountry)
    ).toEqual(["CA", "DE", "EU", null]);
  },
};

/** Germany has its own $7 rate, and is listed once */
export const EUCountryWithItsOwnRate: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await chooseDestination(
      canvasElement,
      `${MERCH_TOTE.id}-ship-1`
    );
    await expect(canvas.getByText(/Order total: \$25\.00/)).toBeVisible();
    await expect(
      canvas.getAllByRole("option", { name: /\(DE\)/ })
    ).toHaveLength(1);
  },
};
