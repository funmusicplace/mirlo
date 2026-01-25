import assert from "node:assert";
import * as dotenv from "dotenv";
import { Request, Response } from "express";

dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";
import sinon from "sinon";

import prisma from "@mirlo/prisma";
import stripeConnectWebhook from "../../../src/routers/v1/webhooks/stripe/connect";
import * as stripeUtils from "../../../src/utils/stripe";
import * as handleFinishedTransactions from "../../../src/utils/handleFinishedTransactions";
import * as sendMailQueueModule from "../../../src/queues/send-mail-queue";
import * as subscriptionModule from "../../../src/utils/subscription";
import Stripe from "stripe";

describe("Stripe Webhooks - Failed Payments", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(async () => {
    sinon.restore();
    await sendMailQueueModule.sendMailQueue.close();
    await sendMailQueueModule.sendMailQueueEvents.close();
  });

  describe("invoice.payment_failed webhook", () => {
    it("should handle failed invoice payment for subscription", async () => {
      const { user } = await createUser({
        email: "subscriber@test.com",
      });
      const artist = await createArtist(user.id);

      // Create a subscription tier
      const tier = await prisma.artistSubscriptionTier.create({
        data: {
          name: "Premium",
          minAmount: 1000,
          currency: "USD",
          artistId: artist.id,
        },
      });

      // Create a subscription
      await prisma.artistUserSubscription.create({
        data: {
          userId: user.id,
          artistSubscriptionTierId: tier.id,
          stripeSubscriptionKey: "sub_1234567890",
          amount: 1000,
          currency: "USD",
        },
      });

      // Mock manageSubscriptionReceipt
      const manageSubscriptionReceiptStub = sinon.stub(
        subscriptionModule,
        "manageSubscriptionReceipt"
      );

      // Create webhook event
      const failedInvoice = {
        id: "in_1234567890",
        object: "invoice",
        subscription: "sub_1234567890",
        payment_intent: "pi_1234567890",
        amount_paid: 1000,
        currency: "usd",
        application_fee_amount: 100,
        metadata: {
          userId: `${user.id}`,
          tierId: `${tier.id}`,
          purchaseType: "subscription",
        },
        status: "open",
      } as unknown as Stripe.Invoice;

      // Mock stripe.paymentIntents.retrieve
      const paymentIntentStub = sinon
        .stub(stripeUtils.stripe.paymentIntents, "retrieve")
        .resolves({
          client_secret: "pi_1234567890_secret_test",
          status: "requires_payment_method",
        } as unknown as Stripe.Response<Stripe.PaymentIntent>);

      // Call the handler
      await stripeUtils.handleInvoicePaymentFailed(
        failedInvoice,
        "acct_test_account"
      );

      // Assert manageSubscriptionReceipt was called
      assert.equal(manageSubscriptionReceiptStub.calledOnce, true);
      const callArgs = manageSubscriptionReceiptStub.getCall(0).args[0];
      assert.equal(callArgs.status, "FAILED");
      assert.equal(callArgs.processorSubscriptionReferenceId, "sub_1234567890");
      assert.ok(callArgs.urlParams?.includes("clientSecret")); // urlParams
    });

    it("should not handle failed invoice payment for non-subscription types", async () => {
      const { user } = await createUser({
        email: "purchaser@test.com",
      });

      // Mock manageSubscriptionReceipt
      const manageSubscriptionReceiptStub = sinon.stub(
        subscriptionModule,
        "manageSubscriptionReceipt"
      );

      const failedInvoice = {
        id: "in_0987654321",
        object: "invoice",
        subscription: "sub_0987654321",
        payment_intent: "pi_0987654321",
        metadata: {
          userId: `${user.id}`,
          purchaseType: "trackGroup", // Not a subscription
        },
        status: "open",
      } as unknown as Stripe.Invoice;

      await stripeUtils.handleInvoicePaymentFailed(
        failedInvoice,
        "acct_test_account"
      );

      // Assert manageSubscriptionReceipt was NOT called
      assert.equal(manageSubscriptionReceiptStub.calledOnce, false);
    });

    it("should handle missing metadata gracefully", async () => {
      const manageSubscriptionReceiptStub = sinon.stub(
        subscriptionModule,
        "manageSubscriptionReceipt"
      );

      const failedInvoice = {
        id: "in_missing_metadata",
        object: "invoice",
        subscription: "sub_missing",
        payment_intent: "pi_missing",
        metadata: {},
        status: "open",
      } as unknown as Stripe.Invoice;

      // Should not throw
      await stripeUtils.handleInvoicePaymentFailed(
        failedInvoice,
        "acct_test_account"
      );

      assert.equal(manageSubscriptionReceiptStub.calledOnce, false);
    });
  });

  describe("payment_intent.payment_failed webhook", () => {
    it("should handle failed payment intent for fundraiser pledge", async () => {
      const { user } = await createUser({
        email: "pledger@test.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      // Create a fundraiser
      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Help Us Record",
          goalAmount: 50000,
          trackGroups: {
            connect: [{ id: trackGroup.id }],
          },
        },
      });

      // Create a transaction
      const transaction = await prisma.userTransaction.create({
        data: {
          userId: user.id,
          amount: 5000,
          currency: "usd",
          paymentStatus: "PENDING",
        },
      });

      // Create a fundraiser pledge
      await prisma.fundraiserPledge.create({
        data: {
          userId: user.id,
          fundraiserId: fundraiser.id,
          amount: 5000,
          associatedTransactionId: transaction.id,
          stripeSetupIntentId: "seti_test_123",
        },
      });

      // Mock handleFundraiserPledgePaymentFailure
      const handleFundraiserPledgePaymentFailureStub = sinon.stub(
        handleFinishedTransactions,
        "handleFundraiserPledgePaymentFailure"
      );

      const failedIntent = {
        id: "pi_fundraiser_failed",
        object: "payment_intent",
        metadata: {
          purchaseType: "fundraiserPledge",
          transactionId: transaction.id,
        },
        status: "requires_payment_method",
        client_secret: "pi_fundraiser_failed_secret_test",
      } as unknown as Stripe.PaymentIntent;

      await stripeUtils.handlePaymentIntentFailed(
        failedIntent,
        "acct_test_account"
      );

      // Assert handleFundraiserPledgePaymentFailure was called
      assert.equal(handleFundraiserPledgePaymentFailureStub.calledOnce, true);
      const callArgs = handleFundraiserPledgePaymentFailureStub.getCall(0).args;
      assert.equal(callArgs[0], String(transaction.id)); // transactionId
      assert.ok(callArgs[1].includes("clientSecret")); // urlParams
      assert.ok(callArgs[1].includes("acct_test_account")); // stripeAccountId
    });

    it("should not handle failed payment intent for non-fundraiser types", async () => {
      const { user } = await createUser({
        email: "buyer@test.com",
      });

      const handleFundraiserPledgePaymentFailureStub = sinon.stub(
        handleFinishedTransactions,
        "handleFundraiserPledgePaymentFailure"
      );

      const failedIntent = {
        id: "pi_non_fundraiser",
        object: "payment_intent",
        metadata: {
          purchaseType: "trackGroup", // Not a fundraiser pledge
          transactionId: "12345",
        },
        status: "requires_payment_method",
        client_secret: "pi_non_fundraiser_secret",
      } as unknown as Stripe.PaymentIntent;

      await stripeUtils.handlePaymentIntentFailed(
        failedIntent,
        "acct_test_account"
      );

      // Assert handleFundraiserPledgePaymentFailure was NOT called
      assert.equal(handleFundraiserPledgePaymentFailureStub.calledOnce, false);
    });

    it("should handle payment intent with missing metadata", async () => {
      const handleFundraiserPledgePaymentFailureStub = sinon.stub(
        handleFinishedTransactions,
        "handleFundraiserPledgePaymentFailure"
      );

      const failedIntent = {
        id: "pi_no_metadata",
        object: "payment_intent",
        metadata: undefined,
        status: "requires_payment_method",
        client_secret: "pi_no_metadata_secret",
      } as unknown as Stripe.PaymentIntent;

      // Should not throw
      await stripeUtils.handlePaymentIntentFailed(
        failedIntent,
        "acct_test_account"
      );

      assert.equal(handleFundraiserPledgePaymentFailureStub.calledOnce, false);
    });
  });

  describe("webhook endpoint integration", () => {
    it("should process invoice.payment_failed event from webhook", async () => {
      const { user } = await createUser({
        email: "webhook@test.com",
      });
      const artist = await createArtist(user.id);
      const tier = await prisma.artistSubscriptionTier.create({
        data: {
          name: "Basic",
          minAmount: 500,
          currency: "USD",
          artistId: artist.id,
        },
      });

      // Mock verifyStripeSignature
      const verifySignatureStub = sinon
        .stub(stripeUtils, "verifyStripeSignature")
        .resolves({
          type: "invoice.payment_failed",
          account: "acct_1234",
          data: {
            object: {
              id: "in_webhook_test",
              subscription: "sub_webhook",
              payment_intent: "pi_webhook",
              metadata: {
                userId: String(user.id),
                tierId: String(tier.id),
                purchaseType: "subscription",
              },
              status: "open",
            },
          },
        } as unknown as Stripe.Event);

      // Mock handleInvoicePaymentFailed
      const handleInvoicePaymentFailedStub = sinon.stub(
        stripeUtils,
        "handleInvoicePaymentFailed"
      );

      // Mock the response object
      const mockResponse = {
        send: sinon.stub(),
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      const req = {} as unknown as Request;
      const res = mockResponse as unknown as Response;
      const next = () => {};

      // Get the webhook handler
      const handler = stripeConnectWebhook();

      // Call POST handler
      await handler.POST(req, res, next);

      // Assert verifyStripeSignature was called
      assert.equal(verifySignatureStub.calledOnce, true);

      // Assert handleInvoicePaymentFailed was called
      assert.equal(handleInvoicePaymentFailedStub.calledOnce, true);

      // Assert response was sent
      assert.equal(mockResponse.send.calledOnce, true);
    });

    it("should process payment_intent.payment_failed event from webhook", async () => {
      const verifySignatureStub = sinon
        .stub(stripeUtils, "verifyStripeSignature")
        .resolves({
          type: "payment_intent.payment_failed",
          account: "acct_1234",
          data: {
            object: {
              id: "pi_webhook_test",
              metadata: {
                purchaseType: "fundraiserPledge",
                transactionId: "123",
              },
              status: "requires_payment_method",
              client_secret: "pi_webhook_secret",
            },
          },
        } as unknown as Stripe.Event);

      // Mock handlePaymentIntentFailed
      const handlePaymentIntentFailedStub = sinon.stub(
        stripeUtils,
        "handlePaymentIntentFailed"
      );

      // Mock the response object
      const mockResponse = {
        send: sinon.stub(),
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      const req = {} as unknown as Request;
      const res = mockResponse as unknown as Response;
      const next = () => {};

      // Get the webhook handler
      const handler = stripeConnectWebhook();

      // Call POST handler
      await handler.POST(req, res, next);

      // Assert verifyStripeSignature was called
      assert.equal(verifySignatureStub.calledOnce, true);

      // Assert handlePaymentIntentFailed was called
      assert.equal(handlePaymentIntentFailedStub.calledOnce, true);

      // Assert response was sent
      assert.equal(mockResponse.send.calledOnce, true);
    });
  });

  describe("handleFundraiserPledgePaymentFailure", () => {
    it("should update transaction status and send failure email", async () => {
      const { user } = await createUser({
        email: "pledger@test.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Help Record",
          goalAmount: 50000,
          trackGroups: {
            connect: [{ id: trackGroup.id }],
          },
        },
      });

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: user.id,
          amount: 5000,
          currency: "usd",
          paymentStatus: "PENDING",
        },
      });

      const pledge = await prisma.fundraiserPledge.create({
        data: {
          userId: user.id,
          fundraiserId: fundraiser.id,
          amount: 5000,
          associatedTransactionId: transaction.id,
          stripeSetupIntentId: "seti_test_123",
        },
      });

      // Mock sendMailQueue.add
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      await handleFinishedTransactions.handleFundraiserPledgePaymentFailure(
        transaction.id,
        "clientSecret=test_secret&stripeAccountId=acct_test"
      );

      // Verify transaction status was updated to FAILED
      const updatedTransaction = await prisma.userTransaction.findFirst({
        where: { id: transaction.id },
      });
      assert.equal(updatedTransaction?.paymentStatus, "FAILED");

      // Verify sendMailQueue.add was called
      assert.equal(sendMailStub.calledOnce, true);
      const mailCall = sendMailStub.getCall(0);
      assert.equal(mailCall.args[1].template, "charge-failure");
      assert.equal(mailCall.args[1].message.to, user.email);
      assert.ok(mailCall.args[1].locals.urlParams.includes("clientSecret"));
    });

    it("should handle missing transaction gracefully", async () => {
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      // Should not throw when transaction doesn't exist
      await handleFinishedTransactions.handleFundraiserPledgePaymentFailure(
        "nonexistent_transaction_id",
        "clientSecret=test&stripeAccountId=acct_test"
      );

      // Email should not be sent
      assert.equal(sendMailStub.calledOnce, false);
    });

    it("should handle transaction with no associated pledge gracefully", async () => {
      const { user } = await createUser({
        email: "user@test.com",
      });

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: user.id,
          amount: 1000,
          currency: "usd",
          paymentStatus: "PENDING",
        },
      });

      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      // Should not throw when pledge is missing
      await handleFinishedTransactions.handleFundraiserPledgePaymentFailure(
        transaction.id,
        "clientSecret=test&stripeAccountId=acct_test"
      );

      // Email should not be sent
      assert.equal(sendMailStub.calledOnce, false);
    });
  });

  describe("handleFundraiserPledgePaymentSuccess", () => {
    it("should update transaction and pledge status and create notifications", async () => {
      const { user } = await createUser({
        email: "pledger@test.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Help Record",
          goalAmount: 50000,
          trackGroups: {
            connect: [{ id: trackGroup.id }],
          },
        },
      });

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: user.id,
          amount: 5000,
          currency: "usd",
          paymentStatus: "PENDING",
        },
      });

      const pledge = await prisma.fundraiserPledge.create({
        data: {
          userId: user.id,
          fundraiserId: fundraiser.id,
          amount: 5000,
          stripeSetupIntentId: "seti_test_123",
          associatedTransactionId: transaction.id,
        },
      });

      // Mock sendMailQueue.add
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      await handleFinishedTransactions.handleFundraiserPledgePaymentSuccess(
        transaction.id
      );

      // Verify transaction status was updated to COMPLETED
      const updatedTransaction = await prisma.userTransaction.findFirst({
        where: { id: transaction.id },
      });
      assert.equal(updatedTransaction?.paymentStatus, "COMPLETED");

      // Verify pledge was updated with paidAt date
      const updatedPledge = await prisma.fundraiserPledge.findFirst({
        where: { id: pledge.id },
      });
      assert.ok(updatedPledge?.paidAt !== null);
      assert.equal(updatedPledge?.associatedTransactionId, transaction.id);

      // Verify notification was created
      const notification = await prisma.notification.findFirst({
        where: { userId: user.id },
      });
      assert.ok(notification);
      assert.equal(notification?.notificationType, "FUNDRAISER_PLEDGE_CHARGED");

      // Verify user track group purchase was created
      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: {
          userId: user.id,
          trackGroupId: trackGroup.id,
        },
      });
      assert.ok(purchase);

      // Verify sendMailQueue.add was called
      assert.equal(sendMailStub.calledOnce, true);
      const mailCall = sendMailStub.getCall(0);
      assert.equal(mailCall.args[1].template, "fundraiser-success");
      assert.equal(mailCall.args[1].message.to, user.email);
    });

    it("should handle missing transaction gracefully", async () => {
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      // Should not throw when transaction doesn't exist
      await handleFinishedTransactions.handleFundraiserPledgePaymentSuccess(
        "nonexistent_transaction_id"
      );

      // Email should not be sent
      assert.equal(sendMailStub.calledOnce, false);
    });

    it("should handle transaction with no associated pledge gracefully", async () => {
      const { user } = await createUser({
        email: "user@test.com",
      });

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: user.id,
          amount: 1000,
          currency: "usd",
          paymentStatus: "PENDING",
        },
      });

      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      // Should not throw when pledge is missing
      await handleFinishedTransactions.handleFundraiserPledgePaymentSuccess(
        transaction.id
      );

      // Email should not be sent
      assert.equal(sendMailStub.calledOnce, false);
    });
  });
});
