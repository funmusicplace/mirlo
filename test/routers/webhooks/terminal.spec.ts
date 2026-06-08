import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";
import prisma from "@mirlo/prisma";

import * as handleFinishedTransactions from "../../../src/utils/handleFinishedTransactions";
import * as stripeUtils from "../../../src/utils/stripe";
import {
  handleTerminalReaderActionFailed,
  handleTerminalReaderActionSucceeded,
} from "../../../src/utils/stripe/terminal";
import {
  clearTables,
  createArtist,
  createTier,
  createTrackGroup,
  createUser,
} from "../../utils";

const buildReader = (
  overrides: Partial<Stripe.Terminal.Reader>
): Stripe.Terminal.Reader =>
  ({
    id: "tmr_test",
    object: "terminal.reader",
    ...overrides,
  }) as unknown as Stripe.Terminal.Reader;

describe("terminal.reader webhooks", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("handleTerminalReaderActionSucceeded — process_payment_intent", () => {
    it("should capture the payment intent and call handleTrackGroupPurchase", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id);

      sinon.stub(stripeUtils.stripe.paymentIntents, "capture").resolves({
        id: "pi_tg_capture",
        amount_received: 1000,
        currency: "usd",
        metadata: {
          purchaseType: "trackGroup",
          trackGroupId: String(tg.id),
          stripeAccountId: "acct_test",
          userId: String(buyer.id),
          userEmail: buyer.email,
          artistId: String(artist.id),
          items: "[]",
        },
        status: "succeeded",
      } as unknown as Stripe.Response<Stripe.PaymentIntent>);

      const handleTrackGroupPurchaseStub = sinon.stub(
        handleFinishedTransactions,
        "handleTrackGroupPurchase"
      );

      const reader = buildReader({
        action: {
          type: "process_payment_intent",
          status: "succeeded",
          process_payment_intent: { payment_intent: "pi_tg_capture" },
        } as any,
      });

      await handleTerminalReaderActionSucceeded(reader, "acct_test");

      assert.ok(
        handleTrackGroupPurchaseStub.calledOnce,
        "handleTrackGroupPurchase should be called once"
      );
      const [, calledTrackGroupId] =
        handleTrackGroupPurchaseStub.getCall(0).args;
      assert.equal(calledTrackGroupId, tg.id);
    });

    it("should capture the payment intent and call handleArtistGift for a tip", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);

      sinon.stub(stripeUtils.stripe.paymentIntents, "capture").resolves({
        id: "pi_tip_capture",
        amount_received: 500,
        currency: "usd",
        metadata: {
          purchaseType: "tip",
          artistId: String(artist.id),
          stripeAccountId: "acct_test",
          userId: String(buyer.id),
          userEmail: buyer.email,
          items: "[]",
        },
        status: "succeeded",
      } as unknown as Stripe.Response<Stripe.PaymentIntent>);

      const handleArtistGiftStub = sinon.stub(
        handleFinishedTransactions,
        "handleArtistGift"
      );

      const reader = buildReader({
        action: {
          type: "process_payment_intent",
          status: "succeeded",
          process_payment_intent: { payment_intent: "pi_tip_capture" },
        } as any,
      });

      await handleTerminalReaderActionSucceeded(reader, "acct_test");

      assert.ok(
        handleArtistGiftStub.calledOnce,
        "handleArtistGift should be called once"
      );
    });

    it("should do nothing when action type is not process_payment_intent or process_setup_intent", async () => {
      const captureStub = sinon.stub(
        stripeUtils.stripe.paymentIntents,
        "capture"
      );

      const reader = buildReader({
        action: {
          type: "collect_inputs",
          status: "succeeded",
        } as any,
      });

      await handleTerminalReaderActionSucceeded(reader, "acct_test");

      assert.ok(
        !captureStub.called,
        "capture should not be called for unknown action types"
      );
    });

    it("should not capture when payment_intent id is missing from the action", async () => {
      const captureStub = sinon.stub(
        stripeUtils.stripe.paymentIntents,
        "capture"
      );

      const reader = buildReader({
        action: {
          type: "process_payment_intent",
          status: "succeeded",
          process_payment_intent: {},
        } as any,
      });

      await handleTerminalReaderActionSucceeded(reader, "acct_test");

      assert.ok(
        !captureStub.called,
        "capture should not be called when payment_intent is absent"
      );
    });
  });

  describe("handleTerminalReaderActionSucceeded — process_setup_intent (subscription)", () => {
    it("should create a Stripe subscription and record it in DB after a terminal setup intent succeeds", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_test",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const tier = await createTier(artist.id, { minAmount: 500 });

      sinon.stub(stripeUtils.stripe.setupIntents, "retrieve").resolves({
        id: "seti_sub_test",
        status: "succeeded",
        payment_method: "pm_card_test",
        metadata: {
          tierId: String(tier.id),
          userId: String(buyer.id),
          userEmail: buyer.email,
          amount: "500",
        },
      } as unknown as Stripe.Response<Stripe.SetupIntent>);

      sinon.stub(stripeUtils.stripe.accounts, "retrieve").resolves({
        id: "acct_sub_test",
        default_currency: "usd",
        country: "US",
      } as unknown as Stripe.Response<Stripe.Account>);

      sinon.stub(stripeUtils.stripe.customers, "list").resolves({
        data: [],
      } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Customer>>);

      sinon.stub(stripeUtils.stripe.customers, "create").resolves({
        id: "cus_test123",
        email: buyer.email,
      } as unknown as Stripe.Response<Stripe.Customer>);

      sinon
        .stub(stripeUtils.stripe.paymentMethods, "attach")
        .resolves({} as unknown as Stripe.Response<Stripe.PaymentMethod>);

      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_test123",
      } as unknown as Stripe.Response<Stripe.Product>);

      sinon.stub(stripeUtils.stripe.subscriptions, "create").resolves({
        id: "sub_terminal_test",
        status: "active",
      } as unknown as Stripe.Response<Stripe.Subscription>);

      const reader = buildReader({
        action: {
          type: "process_setup_intent",
          status: "succeeded",
          process_setup_intent: { setup_intent: "seti_sub_test" },
        } as any,
      });

      await handleTerminalReaderActionSucceeded(reader, "acct_sub_test");

      const subscription = await prisma.artistUserSubscription.findFirst({
        where: { userId: buyer.id, artistSubscriptionTierId: tier.id },
      });
      assert.ok(subscription, "subscription should be saved to DB");
      assert.equal(subscription.amount, 500);
      assert.equal(subscription.stripeSubscriptionKey, "sub_terminal_test");
    });

    it("should log a warning and return early when setup_intent id is missing", async () => {
      const retrieveStub = sinon.stub(
        stripeUtils.stripe.setupIntents,
        "retrieve"
      );

      const reader = buildReader({
        action: {
          type: "process_setup_intent",
          status: "succeeded",
          process_setup_intent: {},
        } as any,
      });

      await handleTerminalReaderActionSucceeded(reader, "acct_test");

      assert.ok(
        !retrieveStub.called,
        "setupIntents.retrieve should not be called"
      );
    });
  });

  describe("handleTerminalReaderActionFailed", () => {
    it("should not throw when the reader action fails", () => {
      const reader = buildReader({
        action: {
          type: "process_payment_intent",
          status: "failed",
          failure_message: "Card declined",
        } as any,
      });

      assert.doesNotThrow(() => {
        handleTerminalReaderActionFailed(reader);
      });
    });

    it("should not throw when failure_message is absent", () => {
      const reader = buildReader({
        action: {
          type: "process_payment_intent",
          status: "failed",
        } as any,
      });

      assert.doesNotThrow(() => {
        handleTerminalReaderActionFailed(reader);
      });
    });
  });
});
