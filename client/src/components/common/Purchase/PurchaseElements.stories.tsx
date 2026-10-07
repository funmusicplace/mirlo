import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";

import { SAMPLE_ADDRESS } from "../../../../.storybook/mocks/react-stripe-js";
import {
  paymentQuote,
  purchaseHandler,
  purchaseMock,
  setupQuote,
} from "../../../../.storybook/purchaseHandlers";
import { resetStripeMock, stripeMock } from "../../../../.storybook/stripeMock";

import PurchaseElements from "./PurchaseElements";
import type { Checkout } from "./usePurchase";

const deferred = (quote = paymentQuote()): Checkout => ({
  kind: "deferred",
  quote,
});

/** The body the pay call sends for the default checkout */
const PAY = { checkoutId: "checkout_storybook" };

const pay = async (canvasElement: HTMLElement, name = "Complete payment") => {
  await userEvent.click(
    await within(canvasElement).findByRole("button", { name })
  );
};

/**
 * The Stripe payment form every checkout renders: email for a guest, a
 * shipping address when the order needs one, then the Payment Element. A
 * deferred checkout creates its intent (POST /v1/purchase) only when the
 * buyer clicks pay. Stripe itself is a local stand-in in Storybook.
 */
const meta = {
  title: "Common/Purchase/PurchaseElements",
  component: PurchaseElements,
  args: {
    checkout: deferred(),
    returnUrl: "https://mirlo.space/lumen-tide/checkout-complete",
    buttonLabel: "Complete payment",
    onSuccess: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[28rem] max-w-full">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    msw: { handlers: { purchase: purchaseHandler(paymentQuote()) } },
  },
} satisfies Meta<typeof PurchaseElements>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Logged in: creates the intent on pay, then confirms it */
export const OneOffPurchase: Story = {
  play: async ({ canvasElement, args }) => {
    await pay(canvasElement);
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalled());
    await expect(purchaseMock.bodies).toEqual([PAY]);
    await expect(stripeMock.confirmed).toEqual([
      {
        method: "payment",
        clientSecret: "pi_checkout_storybook_secret_storybook",
      },
    ]);
  },
};

/** Logged out: the form asks for an email and sends it with the pay call */
export const GuestCheckout: Story = {
  args: { checkout: deferred(paymentQuote({ buyerEmailKnown: false })) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByLabelText("Email"),
      "maya.okafor@fastmail.com"
    );
    await pay(canvasElement);
    await waitFor(() =>
      expect(args.onSuccess).toHaveBeenCalledWith("maya.okafor@fastmail.com")
    );
    await expect(purchaseMock.bodies).toEqual([
      { ...PAY, email: "maya.okafor@fastmail.com" },
    ]);
  },
};

/**
 * A subscription tier that collects an address: setup mode, so the address
 * travels with the pay call to the SetupIntent rather than with the confirm
 */
export const SubscriptionWithAddress: Story = {
  args: {
    checkout: deferred(setupQuote({ requiresShipping: true })),
    buttonLabel: "Let's support",
  },
  parameters: {
    msw: { handlers: { purchase: purchaseHandler(setupQuote()) } },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByTestId("address-element")
    ).toBeInTheDocument();
    await pay(canvasElement, "Let's support");
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalled());
    await expect(purchaseMock.bodies[0]).toEqual({
      ...PAY,
      shippingAddress: SAMPLE_ADDRESS,
    });
    await expect(stripeMock.confirmed).toEqual([
      {
        method: "setup",
        clientSecret: "seti_checkout_storybook_secret_storybook",
      },
    ]);
  },
};

/**
 * A declined card, then a retry: the retry posts the checkout again and the
 * server hands back an intent to confirm
 */
export const DeclinedThenRetry: Story = {
  beforeEach: () => {
    resetStripeMock("declined");
  },
  play: async ({ canvasElement, args }) => {
    await pay(canvasElement);
    await waitFor(() => expect(stripeMock.confirmed).toHaveLength(1));
    stripeMock.outcome = "succeeded";
    await waitFor(() =>
      expect(
        within(canvasElement).getByRole("button", { name: "Complete payment" })
      ).toBeEnabled()
    );
    await pay(canvasElement);
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalled());
    await expect(purchaseMock.bodies).toEqual([PAY, PAY]);
    await expect(stripeMock.confirmed).toHaveLength(2);
  },
};

/**
 * An intent made elsewhere (updating a subscription's card): confirmed as
 * is, with nothing posted
 */
export const ExistingIntent: Story = {
  args: {
    checkout: {
      kind: "intent",
      clientSecret: "seti_existing_secret_storybook",
      stripeAccountId: "acct_1",
    },
    buttonLabel: "Update payment method",
  },
  play: async ({ canvasElement, args }) => {
    await pay(canvasElement, "Update payment method");
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalled());
    await expect(purchaseMock.bodies).toEqual([]);
    await expect(stripeMock.confirmed).toEqual([
      { method: "setup", clientSecret: "seti_existing_secret_storybook" },
    ]);
  },
};
