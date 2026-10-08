import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { http, HttpResponse } from "msw";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import {
  paymentQuote,
  purchaseHandler,
  purchaseMock,
  setupQuote,
} from "../../../.storybook/purchaseHandlers";
import { stripeMock } from "../../../.storybook/stripeMock";
import { authAs } from "../../showcase/shared/helpers";

import HostedCheckout from "./Index";

const CHECKOUT_ID = "checkout_storybook";

/**
 * This page has no onSuccess, so paying sends the buyer to the checkout's
 * successUrl. A fragment keeps that inside the story instead of navigating
 * the preview away.
 */
const PAID_URL = "#paid";

const at = (searchParams: Record<string, string>) =>
  reactRouterParameters({
    location: { path: "/checkout", searchParams },
    routing: { path: "/checkout" },
  });

/**
 * Mirlo's hosted checkout, where an external API client (e.g. the
 * WordPress plugin) sends a buyer with the `checkoutId` of the cart it
 * opened. Opening the page quotes that checkout; paying creates the intent.
 */
const meta = {
  title: "Pages/HostedCheckout",
  component: HostedCheckout,
  parameters: {
    layout: "fullscreen",
    reactRouter: at({ checkoutId: CHECKOUT_ID }),
    msw: {
      handlers: {
        auth: authAs(null),
        purchase: purchaseHandler(
          paymentQuote({ buyerEmailKnown: false, successUrl: PAID_URL })
        ),
      },
    },
  },
} satisfies Meta<typeof HostedCheckout>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A guest buying an album: email, card, pay, then off to the successUrl */
export const GuestPurchase: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Paying $10.00 to Lumen Tide")
    ).toBeInTheDocument();
    await userEvent.type(
      await canvas.findByLabelText("Email"),
      "maya.okafor@fastmail.com"
    );
    await userEvent.click(canvas.getByRole("button", { name: "Pay now" }));
    await waitFor(() => expect(stripeMock.confirmed).toHaveLength(1));
    await expect(purchaseMock.bodies).toEqual([
      { checkoutId: CHECKOUT_ID, deferred: true },
      {
        checkoutId: CHECKOUT_ID,
        email: "maya.okafor@fastmail.com",
        amount: 1000,
      },
    ]);
    await waitFor(() => expect(window.location.hash).toBe(PAID_URL));
  },
};

/** The API client already sent the buyer's email, so no email field */
export const EmailKnown: Story = {
  parameters: {
    msw: { handlers: { purchase: purchaseHandler(paymentQuote()) } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "Pay now" });
    await expect(canvas.queryByLabelText("Email")).not.toBeInTheDocument();
  },
};

/** A subscription tier that mails something: setup mode with an address */
export const SubscriptionWithAddress: Story = {
  parameters: {
    msw: {
      handlers: {
        purchase: purchaseHandler(
          setupQuote({ requiresShipping: true, buyerEmailKnown: false })
        ),
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Paying Lumen Tide")
    ).toBeInTheDocument();
    await expect(canvas.getByTestId("address-element")).toBeInTheDocument();
  },
};

/** The link of a checkout that's already been paid */
export const AlreadyPaid: Story = {
  parameters: {
    msw: {
      handlers: {
        purchase: http.post("*/v1/purchase", () =>
          HttpResponse.json({ success: true })
        ),
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(
        "This purchase has already been completed."
      )
    ).toBeInTheDocument();
  },
};

/** A checkout that doesn't exist (or has been cleaned up) */
export const ExpiredLink: Story = {
  parameters: {
    msw: {
      handlers: {
        purchase: http.post("*/v1/purchase", () =>
          HttpResponse.json(
            { error: "This checkout doesn't exist" },
            { status: 404 }
          )
        ),
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(/couldn't load this checkout/)
    ).toBeInTheDocument();
  },
};

/** No checkout in the URL (an empty one; story parameters merge with the default) */
export const MissingToken: Story = {
  parameters: { reactRouter: at({ checkoutId: "" }) },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(/missing required information/)
    ).toBeInTheDocument();
  },
};
