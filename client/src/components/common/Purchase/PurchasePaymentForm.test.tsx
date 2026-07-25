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

const callOrder: string[] = [];
const confirmSetup = vi.fn(() => {
  callOrder.push("confirmSetup");
  return Promise.resolve({ setupIntent: { status: "succeeded" } });
});
const confirmPayment = vi.fn();
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
});
