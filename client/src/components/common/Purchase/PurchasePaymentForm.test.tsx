import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

const authState: { user: any } = { user: { id: 1, email: "buyer@test.com" } };
vi.mock("state/AuthContext", () => ({
  useAuthContext: () => ({ user: authState.user }),
}));

const callOrder: string[] = [];
const confirmSetup = vi.fn(() => {
  callOrder.push("confirmSetup");
  return Promise.resolve({ setupIntent: { status: "succeeded" } });
});
const confirmPayment = vi.fn(() => {
  callOrder.push("confirmPayment");
  return Promise.resolve({ paymentIntent: { status: "succeeded" } });
});
const addressValue: {
  value: { name: string; address: Record<string, unknown> };
} = {
  value: {
    name: "Buyer Name",
    address: { line1: "123 Main St", country: "US" },
  },
};
const getElement = vi.fn(() => ({
  getValue: () => Promise.resolve(addressValue),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  useStripe: () => ({ confirmSetup, confirmPayment }),
  useElements: () => ({ getElement }),
  PaymentElement: ({ onReady, onChange }: any) => (
    <div
      data-testid="payment-element"
      onClick={() => {
        onReady();
        onChange({ complete: true });
      }}
    />
  ),
  AddressElement: ({ onChange }: any) => (
    <div
      data-testid="address-element"
      onClick={() => onChange({ complete: true })}
    />
  ),
}));

const putMock = vi.fn((..._args: unknown[]) => {
  callOrder.push("put");
  return Promise.resolve({ result: { id: "seti_123" } });
});
vi.mock("services/api", () => ({
  default: { put: (...args: unknown[]) => putMock(...args) },
}));

const handler = vi.fn();
vi.mock("services/useErrorHandler", () => ({
  default: () => handler,
}));

import PurchasePaymentForm from "./PurchasePaymentForm";

async function readyTheForm() {
  fireEvent.click(screen.getByTestId("payment-element"));
  await waitFor(() => expect(screen.getByRole("button")).toBeInTheDocument());
}

describe("PurchasePaymentForm", () => {
  beforeEach(() => {
    callOrder.length = 0;
    confirmSetup.mockClear();
    confirmPayment.mockClear();
    getElement.mockClear();
    putMock.mockClear();
    handler.mockClear();
    authState.user = { id: 1, email: "buyer@test.com" };
    putMock.mockImplementation(() => {
      callOrder.push("put");
      return Promise.resolve({ result: { id: "seti_123" } });
    });
  });

  test("PUTs the collected shipping address before confirming a subscription SetupIntent", async () => {
    render(
      <PurchasePaymentForm
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
        requiresShipping
        isSetup
        clientSecret="seti_123_secret_abc"
        stripeAccountId="acct_1"
      />
    );

    await readyTheForm();
    fireEvent.click(screen.getByTestId("address-element"));

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(confirmSetup).toHaveBeenCalled());

    expect(putMock).toHaveBeenCalledWith(
      "purchase/seti_123?stripeAccountId=acct_1",
      { shippingAddress: addressValue.value }
    );
    // The address must be saved (SetupIntents have no native shipping field)
    // before confirmSetup — not passed through confirmParams like confirmPayment.
    expect(callOrder).toEqual(["put", "confirmSetup"]);
    expect(confirmSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmParams: { return_url: "https://example.com/return" },
      })
    );
  });

  test("does not call the shipping PUT when requiresShipping is false", async () => {
    render(
      <PurchasePaymentForm
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
        isSetup
        clientSecret="seti_456_secret_abc"
        stripeAccountId="acct_1"
      />
    );

    await readyTheForm();
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(confirmSetup).toHaveBeenCalled());
    expect(putMock).not.toHaveBeenCalled();
  });

  test("shows an error and does not confirm when the shipping PUT fails", async () => {
    putMock.mockRejectedValue(new Error("network error"));

    render(
      <PurchasePaymentForm
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
        requiresShipping
        isSetup
        clientSecret="seti_789_secret_abc"
        stripeAccountId="acct_1"
      />
    );

    await readyTheForm();
    fireEvent.click(screen.getByTestId("address-element"));
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(putMock).toHaveBeenCalled());
    expect(confirmSetup).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
  });

  test("does not ask a logged-in buyer for an email", async () => {
    render(
      <PurchasePaymentForm
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
        clientSecret="pi_123_secret_abc"
        stripeAccountId="acct_1"
      />
    );

    await readyTheForm();
    expect(screen.queryByLabelText("email")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(confirmPayment).toHaveBeenCalled());
    // Their identity went onto the intent when it was created.
    expect(putMock).not.toHaveBeenCalled();
  });

  test("attaches a logged-out buyer's email to the intent before confirming", async () => {
    authState.user = null;
    const onSuccess = vi.fn();

    render(
      <PurchasePaymentForm
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={onSuccess}
        clientSecret="pi_123_secret_abc"
        stripeAccountId="acct_1"
      />
    );

    await readyTheForm();
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "anon@example.com" },
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(confirmPayment).toHaveBeenCalled());

    expect(putMock).toHaveBeenCalledWith(
      "purchase/pi_123?stripeAccountId=acct_1",
      { email: "anon@example.com" }
    );
    expect(callOrder).toEqual(["put", "confirmPayment"]);
    expect(confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmParams: expect.objectContaining({
          receipt_email: "anon@example.com",
        }),
      })
    );
    expect(onSuccess).toHaveBeenCalledWith("anon@example.com");
  });

  test("does not confirm when the buyer's email is invalid", async () => {
    authState.user = null;

    render(
      <PurchasePaymentForm
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
        clientSecret="pi_123_secret_abc"
        stripeAccountId="acct_1"
      />
    );

    await readyTheForm();
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "not-an-email" },
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(screen.getByText("invalidEmail")).toBeInTheDocument()
    );
    expect(putMock).not.toHaveBeenCalled();
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  test("does not confirm when attaching the buyer fails", async () => {
    authState.user = null;
    putMock.mockRejectedValue(new Error("network error"));

    render(
      <PurchasePaymentForm
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
        clientSecret="pi_123_secret_abc"
        stripeAccountId="acct_1"
      />
    );

    await readyTheForm();
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "anon@example.com" },
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(putMock).toHaveBeenCalled());
    expect(confirmPayment).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
  });

  test("attaches a logged-in buyer's session to an intent that has no identity", async () => {
    render(
      <PurchasePaymentForm
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
        clientSecret="pi_123_secret_abc"
        stripeAccountId="acct_1"
        buyerEmailKnown={false}
      />
    );

    await readyTheForm();
    expect(screen.queryByLabelText("email")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(confirmPayment).toHaveBeenCalled());
    expect(putMock).toHaveBeenCalledWith(
      "purchase/pi_123?stripeAccountId=acct_1",
      {}
    );
  });
});
