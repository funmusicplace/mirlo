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
const submit = vi.fn((): Promise<{ error?: { message: string } }> => {
  callOrder.push("submit");
  return Promise.resolve({});
});

vi.mock("@stripe/react-stripe-js", () => ({
  useStripe: () => ({ confirmSetup, confirmPayment }),
  useElements: () => ({ getElement, submit }),
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

const postMock = vi.fn(
  (..._args: unknown[]): Promise<{ clientSecret?: string }> => {
    callOrder.push("post");
    return Promise.resolve({ clientSecret: "pi_new_secret_abc" });
  }
);
vi.mock("services/api", () => ({
  default: { post: (...args: unknown[]) => postMock(...args) },
}));

const handler = vi.fn();
vi.mock("services/useErrorHandler", () => ({
  default: () => handler,
}));

import PurchasePaymentForm from "./PurchasePaymentForm";
import type { Checkout, DeferredQuote } from "./usePurchase";

/** What the pay call sends: the saved checkout */
const request = { checkoutId: "txn_1" };

const deferred = (quote: Partial<DeferredQuote> = {}): Checkout => ({
  kind: "deferred",
  quote: {
    checkoutId: "txn_1",
    mode: "payment",
    amount: 500,
    currency: "usd",
    stripeAccountId: "acct_1",
    requiresShipping: false,
    buyerEmailKnown: true,
    artistName: null,
    successUrl: null,
    ...quote,
  },
});

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
    submit.mockClear();
    postMock.mockClear();
    handler.mockClear();
    authState.user = { id: 1, email: "buyer@test.com" };
    submit.mockImplementation(() => {
      callOrder.push("submit");
      return Promise.resolve({});
    });
    postMock.mockImplementation(() => {
      callOrder.push("post");
      return Promise.resolve({ clientSecret: "pi_new_secret_abc" });
    });
  });

  test("validates, creates the intent, then confirms it with the returned secret", async () => {
    render(
      <PurchasePaymentForm
        checkout={deferred()}
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
      />
    );

    await readyTheForm();
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(confirmPayment).toHaveBeenCalled());
    expect(callOrder).toEqual(["submit", "post", "confirmPayment"]);
    expect(postMock).toHaveBeenCalledWith("purchase", request);
    expect(confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({ clientSecret: "pi_new_secret_abc" })
    );
  });

  test("stops before creating anything when Elements validation fails", async () => {
    submit.mockImplementation(() =>
      Promise.resolve({ error: { message: "Card number incomplete" } })
    );

    render(
      <PurchasePaymentForm
        checkout={deferred()}
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
      />
    );

    await readyTheForm();
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(postMock).not.toHaveBeenCalled();
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  test("retries a declined payment by paying the same checkout again", async () => {
    confirmPayment.mockImplementationOnce(() => {
      callOrder.push("confirmPayment");
      return Promise.resolve({
        error: { message: "Your card was declined." },
      } as any);
    });

    render(
      <PurchasePaymentForm
        checkout={deferred()}
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
      />
    );

    await readyTheForm();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(handler).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(confirmPayment).toHaveBeenCalledTimes(2));

    // The server returns the intent the first attempt created.
    expect(postMock).toHaveBeenNthCalledWith(2, "purchase", request);
  });

  test("does not confirm when creating the intent fails", async () => {
    postMock.mockRejectedValue(new Error("network error"));

    render(
      <PurchasePaymentForm
        checkout={deferred()}
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
      />
    );

    await readyTheForm();
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(confirmPayment).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
  });

  test("sends a subscription's shipping address with the SetupIntent request", async () => {
    postMock.mockImplementation(() => {
      callOrder.push("post");
      return Promise.resolve({ clientSecret: "seti_new_secret_abc" });
    });

    render(
      <PurchasePaymentForm
        checkout={deferred({
          mode: "setup",
          amount: undefined,
          requiresShipping: true,
        })}
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
      />
    );

    await readyTheForm();
    fireEvent.click(screen.getByTestId("address-element"));
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(confirmSetup).toHaveBeenCalled());
    expect(postMock).toHaveBeenCalledWith("purchase", {
      ...request,
      shippingAddress: addressValue.value,
    });
    expect(confirmSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSecret: "seti_new_secret_abc",
        confirmParams: { return_url: "https://example.com/return" },
      })
    );
  });

  test("confirms a ready-made intent without creating one", async () => {
    render(
      <PurchasePaymentForm
        checkout={{
          kind: "intent",
          clientSecret: "seti_existing_secret_abc",
          stripeAccountId: "acct_1",
        }}
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
      />
    );

    await readyTheForm();
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(confirmSetup).toHaveBeenCalled());
    expect(submit).not.toHaveBeenCalled();
    expect(postMock).not.toHaveBeenCalled();
    expect(confirmSetup).toHaveBeenCalledWith(
      expect.objectContaining({ clientSecret: "seti_existing_secret_abc" })
    );
  });

  test("does not ask a logged-in buyer for an email", async () => {
    render(
      <PurchasePaymentForm
        checkout={deferred({ buyerEmailKnown: false })}
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
      />
    );

    await readyTheForm();
    expect(screen.queryByLabelText("email")).not.toBeInTheDocument();
  });

  test("sends a logged-out buyer's email with the intent request", async () => {
    authState.user = null;
    const onSuccess = vi.fn();

    render(
      <PurchasePaymentForm
        checkout={deferred({ buyerEmailKnown: false })}
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={onSuccess}
      />
    );

    await readyTheForm();
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "anon@example.com" },
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(confirmPayment).toHaveBeenCalled());

    expect(postMock).toHaveBeenCalledWith("purchase", {
      ...request,
      email: "anon@example.com",
    });
    expect(confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmParams: expect.objectContaining({
          receipt_email: "anon@example.com",
        }),
      })
    );
    expect(onSuccess).toHaveBeenCalledWith("anon@example.com");
  });

  test("does not create an intent when the buyer's email is invalid", async () => {
    authState.user = null;

    render(
      <PurchasePaymentForm
        checkout={deferred({ buyerEmailKnown: false })}
        returnUrl="https://example.com/return"
        buttonLabel="Pay"
        onSuccess={vi.fn()}
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
    expect(postMock).not.toHaveBeenCalled();
    expect(confirmPayment).not.toHaveBeenCalled();
  });
});
