import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { reactRouterParameters } from "storybook-addon-remix-react-router";

import { purchaseMock } from "../../../../.storybook/purchaseHandlers";
import { resetStripeMock, stripeMock } from "../../../../.storybook/stripeMock";

import Billing from "./Index";

const CLIENT_SECRET = "pi_failed_invoice_secret_storybook";

const at = (searchParams: Record<string, string>) =>
  reactRouterParameters({
    location: { path: "/profile/billing", searchParams },
    routing: { path: "/profile/billing" },
  });

const PAYMENT_LINK = {
  clientSecret: CLIENT_SECRET,
  stripeAccountId: "acct_storybook",
};

/**
 * Where the charge-failure email sends someone whose subscription renewal
 * or fundraiser pledge couldn't be charged. The link carries the failed
 * PaymentIntent, which the page confirms with a new payment method.
 */
const meta = {
  title: "Pages/Billing",
  component: Billing,
  parameters: {
    layout: "fullscreen",
    reactRouter: at(PAYMENT_LINK),
  },
} satisfies Meta<typeof Billing>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Paying the failed charge confirms the existing intent, nothing is posted */
export const PayFailedCharge: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Pay now" })
    );
    await expect(
      await canvas.findByText("Thanks! Your payment has been submitted.")
    ).toBeInTheDocument();
    await expect(stripeMock.confirmed).toEqual([
      { method: "payment", clientSecret: CLIENT_SECRET },
    ]);
    await expect(purchaseMock.bodies).toEqual([]);
  },
};

/** The new card is declined too, so the form stays up for another try */
export const Declined: Story = {
  beforeEach: () => {
    resetStripeMock("declined");
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Pay now" })
    );
    await waitFor(() => expect(stripeMock.confirmed).toHaveLength(1));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Pay now" })).toBeEnabled()
    );
    await expect(
      canvas.queryByText("Thanks! Your payment has been submitted.")
    ).not.toBeInTheDocument();
  },
};

/** Back from a 3D Secure check that went through */
export const BackFromBankCheck: Story = {
  beforeEach: () => {
    resetStripeMock("succeeded", "succeeded");
  },
  parameters: {
    reactRouter: at({ ...PAYMENT_LINK, redirect_status: "succeeded" }),
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(
        "Thanks! Your payment has been submitted."
      )
    ).toBeInTheDocument();
  },
};

/** Opening the email link again after the payment went through */
export const AlreadyPaid: Story = {
  beforeEach: () => {
    resetStripeMock("succeeded", "succeeded");
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(
        "This payment has already been made. There's nothing more to do."
      )
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Pay now" })
    ).not.toBeInTheDocument();
  },
};

/** A bank payment still settling, whatever the URL says */
export const Processing: Story = {
  beforeEach: () => {
    resetStripeMock("succeeded", "processing");
  },
  parameters: {
    reactRouter: at({ ...PAYMENT_LINK, redirect_status: "processing" }),
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(
        "Your payment is being processed. We'll email you if anything goes wrong."
      )
    ).toBeInTheDocument();
  },
};

/** The invoice was voided, e.g. after Stripe gave up retrying */
export const NoLongerDue: Story = {
  beforeEach: () => {
    resetStripeMock("succeeded", "canceled");
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("This payment is no longer due.")
    ).toBeInTheDocument();
  },
};

/** A link without the payment's details (empty, as story parameters merge with the default) */
export const MissingPayment: Story = {
  parameters: { reactRouter: at({ clientSecret: "", stripeAccountId: "" }) },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("No payment found")
    ).toBeInTheDocument();
  },
};
