import * as dotenv from "dotenv";
dotenv.config();

import assert from "node:assert";

import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";

import stripe from "../../src/utils/stripe";
import { getFeesFromPaymentIntent } from "../../src/utils/stripe/completedPayment";

describe("getFeesFromPaymentIntent", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("returns zero fees and the raw application fee when there is no latest_charge", async () => {
    const result = await getFeesFromPaymentIntent(
      {
        application_fee_amount: 150,
        latest_charge: null,
      } as unknown as Stripe.PaymentIntent,
      "acct_test"
    );

    assert.equal(result.applicationFee, 150);
    assert.equal(result.paymentProcessorFee, 0);
  });

  it("reuses an already-expanded latest_charge.balance_transaction without an extra Stripe call", async () => {
    const chargesRetrieveStub = sinon.stub(stripe.charges, "retrieve");

    const result = await getFeesFromPaymentIntent(
      {
        application_fee_amount: 200,
        latest_charge: {
          balance_transaction: {
            fee_details: [{ type: "stripe_fee", amount: 30 }],
          },
        },
      } as unknown as Stripe.PaymentIntent,
      "acct_test"
    );

    assert.equal(result.applicationFee, 200);
    assert.equal(result.paymentProcessorFee, 30);
    assert.equal(
      chargesRetrieveStub.called,
      false,
      "should not re-fetch the charge when balance_transaction is already expanded"
    );
  });

  it("fetches the charge when latest_charge is only an id, and extracts the stripe_fee", async () => {
    const chargesRetrieveStub = sinon
      .stub(stripe.charges, "retrieve")
      .resolves({
        balance_transaction: {
          fee_details: [{ type: "stripe_fee", amount: 45 }],
        },
        // @ts-ignore — only the fields getFeesFromPaymentIntent reads are needed
      } as Stripe.Response<Stripe.Charge>);

    const result = await getFeesFromPaymentIntent(
      {
        application_fee_amount: 0,
        latest_charge: "ch_only_an_id",
      } as unknown as Stripe.PaymentIntent,
      "acct_test"
    );

    assert.equal(result.applicationFee, 0);
    assert.equal(result.paymentProcessorFee, 45);
    assert.ok(chargesRetrieveStub.calledOnce);
    assert.equal(chargesRetrieveStub.firstCall.args[0], "ch_only_an_id");
  });

  it("returns zero processing fee when the balance transaction has no stripe_fee entry", async () => {
    const result = await getFeesFromPaymentIntent(
      {
        application_fee_amount: 0,
        latest_charge: {
          balance_transaction: {
            fee_details: [{ type: "tax", amount: 5 }],
          },
        },
      } as unknown as Stripe.PaymentIntent,
      "acct_test"
    );

    assert.equal(result.paymentProcessorFee, 0);
  });
});
