// Storybook stand-in for @stripe/react-stripe-js; see ../stripeMock.ts. It
// renders look-alike, pre-filled fields and resolves confirms locally.
import React from "react";

import { stripeMock } from "../stripeMock";

export const SAMPLE_ADDRESS = {
  name: "Maya Okafor",
  address: {
    line1: "1458 Rue Saint-Denis",
    line2: undefined,
    city: "Montréal",
    state: "QC",
    postal_code: "H2X 3J6",
    country: "CA",
  },
};

const field =
  "w-full rounded border border-(--mi-darken-x-background-color) bg-(--mi-normal-background-color) px-3 py-2";

const Field: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <label className="flex flex-col gap-1 text-sm">
    {label}
    <input className={field} defaultValue={value} readOnly />
  </label>
);

export const Elements: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

export const PaymentElement: React.FC<{
  onReady?: () => void;
  onChange?: (e: { complete: boolean }) => void;
}> = ({ onReady, onChange }) => {
  React.useEffect(() => {
    onReady?.();
    onChange?.({ complete: true });
    // Once, like Stripe's own ready event
  }, []);
  return (
    <div className="flex flex-col gap-2" data-testid="payment-element">
      <Field label="Card number" value="4242 4242 4242 4242" />
      <div className="flex gap-2">
        <Field label="Expiry" value="12 / 34" />
        <Field label="CVC" value="123" />
      </div>
    </div>
  );
};

export const AddressElement: React.FC<{
  onChange?: (e: { complete: boolean }) => void;
}> = ({ onChange }) => {
  React.useEffect(() => {
    onChange?.({ complete: true });
  }, []);
  return (
    <div className="mb-4 flex flex-col gap-2" data-testid="address-element">
      <Field label="Full name" value={SAMPLE_ADDRESS.name} />
      <Field label="Address" value={SAMPLE_ADDRESS.address.line1} />
      <div className="flex gap-2">
        <Field label="City" value={SAMPLE_ADDRESS.address.city} />
        <Field label="Postal code" value={SAMPLE_ADDRESS.address.postal_code} />
      </div>
    </div>
  );
};

const elements = {
  submit: () => Promise.resolve({}),
  getElement: () => ({
    getValue: () => Promise.resolve({ complete: true, value: SAMPLE_ADDRESS }),
  }),
};

export const useElements = () => elements;

// Records which confirm was called, so a story asserting "this was a setup,
// not a payment" can actually fail if the form calls the wrong one.
const confirm =
  (method: "payment" | "setup") =>
  async ({ clientSecret }: { clientSecret?: string }) => {
    stripeMock.confirmed.push({ method, clientSecret: clientSecret ?? "" });
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (stripeMock.outcome === "declined") {
      return {
        error: { type: "card_error", message: "Your card was declined." },
      };
    }
    const key = method === "payment" ? "paymentIntent" : "setupIntent";
    return { [key]: { status: "succeeded" } };
  };

const stripe = {
  confirmPayment: confirm("payment"),
  confirmSetup: confirm("setup"),
};

export const useStripe = () => stripe;

// The embedded Checkout Session flows aren't rendered in any story.
export const EmbeddedCheckoutProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => <>{children}</>;
export const EmbeddedCheckout: React.FC = () => null;
