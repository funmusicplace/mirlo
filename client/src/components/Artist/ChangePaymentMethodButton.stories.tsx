import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";

import { stripeMock } from "../../../.storybook/stripeMock";

import ChangePaymentMethodButton from "./ChangePaymentMethodButton";

/**
 * Lets a subscriber replace the card on an existing subscription. The server
 * makes the SetupIntent (PUT manage/subscriptions/:id) and the modal
 * confirms it as is — this flow never goes through POST /v1/purchase.
 */
const meta = {
  title: "Artist/ChangePaymentMethodButton",
  component: ChangePaymentMethodButton,
  args: { subscriptionId: 55, onUpdated: fn() },
  parameters: {
    layout: "centered",
    msw: {
      handlers: {
        subscription: http.put("*/v1/manage/subscriptions/:id", () =>
          HttpResponse.json({
            result: {
              clientSecret: "seti_pm_secret_storybook",
              stripeAccountId: "acct_1",
            },
          })
        ),
      },
    },
  },
} satisfies Meta<typeof ChangePaymentMethodButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Saving a new card confirms the server's SetupIntent */
export const UpdatesCard: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      await within(canvasElement).findByRole("button", {
        name: "Change payment method",
      })
    );
    await userEvent.click(
      await within(document.body).findByRole("button", {
        name: "Save new payment method",
      })
    );
    await waitFor(() => expect(args.onUpdated).toHaveBeenCalled());
    await expect(stripeMock.confirmed).toEqual([
      { method: "setup", clientSecret: "seti_pm_secret_storybook" },
    ]);
  },
};
