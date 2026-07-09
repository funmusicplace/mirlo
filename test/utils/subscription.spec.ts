import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sinon from "sinon";

import * as sendMailQueueModule from "../../src/queues/send-mail-queue";
import { ArtistSubscriptionReceiptEmailType } from "../../src/utils/handleFinishedTransactions";
import {
  manageSubscriptionReceipt,
  ArtistNewSubscriberAnnounceEmailType,
} from "../../src/utils/subscription";
import { clearTables, createUser } from "../utils";

import prisma from "@mirlo/prisma";

import assert from "assert";

describe("subscription", () => {
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

  describe("manageSubscriptionReceipt", () => {
    it("should send out an email on receipt of a subscription charge", async () => {
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });

      const { user: subscriber } = await createUser({
        email: "follower@follower.com",
        emailConfirmationToken: null,
      });

      const artist = await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: "test-artist",
          userId: artistUser.id,
          enabled: true,
        },
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Tier",
        },
      });

      const subscriptionKey = "test-key";
      const invoiceId = "invoice-key";

      const subscription = await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: subscriptionKey,
          deletedAt: null,
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 10,
        },
      });

      await manageSubscriptionReceipt({
        processorPaymentReferenceId: invoiceId,
        processorSubscriptionReferenceId: subscriptionKey,
        amountPaid: 10,
        currency: "usd",
        platformCut: 2,
        paymentProcessorFee: 0.3,
        billingReason: "subscription_create",
        status: "COMPLETED",
      });

      const charge = await prisma.userTransaction.findMany({
        where: {
          stripeId: invoiceId,
        },
        include: {
          artistUserSubscriptionCharges: true,
        },
      });

      assert.equal(charge.length, 1);
      assert.equal(charge[0].amount, 10);
      assert.equal(
        charge[0].artistUserSubscriptionCharges[0].artistUserSubscriptionId,
        subscription.id
      );

      assert.equal(sendMailStub.calledTwice, true);
      const data0 = sendMailStub.getCall(0).args[1];
      assert.equal(data0.template, "artist-subscription-receipt");
      assert.equal(data0.message.to, "follower@follower.com");
      const locals = data0.locals as ArtistSubscriptionReceiptEmailType;
      assert.equal(
        locals.artistUserSubscription.artistSubscriptionTierId,
        tier.id
      );
      assert.equal(locals.artistUserSubscription.amount, 10);
    });

    it("should store nextBillingDate when provided", async () => {
      sinon.stub(sendMailQueueModule.sendMailQueue, "add").resolves({} as any);

      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });

      const { user: subscriber } = await createUser({
        email: "follower@follower.com",
        emailConfirmationToken: null,
      });

      const artist = await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: "test-artist",
          userId: artistUser.id,
          enabled: true,
        },
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Tier",
        },
      });

      const subscriptionKey = "test-key-billing-date";
      const invoiceId = "invoice-key-billing-date";

      const subscription = await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: subscriptionKey,
          deletedAt: null,
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 1200,
        },
      });

      const nextBillingDate = new Date("2025-12-31");

      await manageSubscriptionReceipt({
        processorPaymentReferenceId: invoiceId,
        processorSubscriptionReferenceId: subscriptionKey,
        amountPaid: 1200,
        currency: "usd",
        platformCut: 240,
        paymentProcessorFee: 30,
        status: "COMPLETED",
        billingReason: "subscription_create",
        nextBillingDate,
      });

      const updatedSubscription =
        await prisma.profileUserSubscription.findUnique({
          where: { id: subscription.id },
        });

      assert.notEqual(updatedSubscription?.nextBillingDate, null);
      assert.deepEqual(updatedSubscription?.nextBillingDate, nextBillingDate);
    });

    it("should not update nextBillingDate when status is FAILED", async () => {
      sinon.stub(sendMailQueueModule.sendMailQueue, "add").resolves({} as any);

      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });

      const { user: subscriber } = await createUser({
        email: "follower@follower.com",
        emailConfirmationToken: null,
      });

      const artist = await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: "test-artist",
          userId: artistUser.id,
          enabled: true,
        },
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Tier",
        },
      });

      const subscriptionKey = "test-key-failed";
      const invoiceId = "invoice-key-failed";

      const subscription = await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: subscriptionKey,
          deletedAt: null,
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 1200,
        },
      });

      const nextBillingDate = new Date("2025-12-31");

      await manageSubscriptionReceipt({
        processorPaymentReferenceId: invoiceId,
        processorSubscriptionReferenceId: subscriptionKey,
        amountPaid: 0,
        currency: "usd",
        platformCut: 0,
        paymentProcessorFee: 0,
        status: "FAILED",
        billingReason: "subscription_cycle",
        nextBillingDate,
      });

      const updatedSubscription =
        await prisma.profileUserSubscription.findUnique({
          where: { id: subscription.id },
        });

      assert.strictEqual(updatedSubscription?.nextBillingDate, null);
    });

    it("should handle nextBillingDate being null", async () => {
      sinon.stub(sendMailQueueModule.sendMailQueue, "add").resolves({} as any);

      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });

      const { user: subscriber } = await createUser({
        email: "follower@follower.com",
        emailConfirmationToken: null,
      });

      const artist = await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: "test-artist",
          userId: artistUser.id,
          enabled: true,
        },
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Tier",
        },
      });

      const subscriptionKey = "test-key-null-date";
      const invoiceId = "invoice-key-null-date";

      const subscription = await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: subscriptionKey,
          deletedAt: null,
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 1200,
        },
      });

      // Should not throw when nextBillingDate is undefined
      await manageSubscriptionReceipt({
        processorPaymentReferenceId: invoiceId,
        processorSubscriptionReferenceId: subscriptionKey,
        amountPaid: 1200,
        currency: "usd",
        platformCut: 240,
        billingReason: "subscription_create",
        paymentProcessorFee: 30,
        status: "COMPLETED",
      });

      const updatedSubscription =
        await prisma.profileUserSubscription.findUnique({
          where: { id: subscription.id },
        });

      assert.strictEqual(updatedSubscription?.nextBillingDate, null);
    });

    it("should send artist notification email when subscription payment completes", async () => {
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });

      const { user: subscriber } = await createUser({
        email: "subscriber@subscriber.com",
        emailConfirmationToken: null,
      });

      const artist = await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: "test-artist",
          userId: artistUser.id,
          enabled: true,
        },
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Premium Tier",
        },
      });

      const subscriptionKey = "test-key-artist-notif";
      const invoiceId = "invoice-key-artist-notif";

      await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: subscriptionKey,
          deletedAt: null,
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 1200,
        },
      });

      await manageSubscriptionReceipt({
        processorPaymentReferenceId: invoiceId,
        processorSubscriptionReferenceId: subscriptionKey,
        amountPaid: 1200,
        currency: "usd",
        platformCut: 240,
        paymentProcessorFee: 30,
        billingReason: "subscription_create",
        status: "COMPLETED",
      });

      // Should have sent 2 emails: one to subscriber, one to artist
      assert.equal(sendMailStub.callCount, 2);

      // First call: subscriber receipt
      const subscriberCallData = sendMailStub.getCall(0).args[1];
      assert.equal(subscriberCallData.template, "artist-subscription-receipt");
      assert.equal(subscriberCallData.message.to, "subscriber@subscriber.com");

      // Second call: artist notification
      const artistCallData = sendMailStub.getCall(1).args[1];
      assert.equal(artistCallData.template, "artist-new-subscriber-announce");
      assert.equal(artistCallData.message.to, "artist@artist.com");
      const artistLocals = artistCallData.locals;
      assert.equal(artistLocals.artist.name, "Test artist");
      assert.equal(artistLocals.user.email, "subscriber@subscriber.com");
      assert.equal(artistLocals.artistUserSubscription.amount, 1200);
    });

    it("should send artist notification to paymentToUser if set", async () => {
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });

      const { user: paymentRecipient } = await createUser({
        email: "payments@manager.com",
      });

      const { user: subscriber } = await createUser({
        email: "subscriber@subscriber.com",
        emailConfirmationToken: null,
      });

      const artist = await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: "test-artist",
          userId: artistUser.id,
          enabled: true,
          paymentToUserId: paymentRecipient.id,
        },
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Premium Tier",
        },
      });

      const subscriptionKey = "test-key-payment-to";
      const invoiceId = "invoice-key-payment-to";

      await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: subscriptionKey,
          deletedAt: null,
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 1200,
        },
      });

      await manageSubscriptionReceipt({
        processorPaymentReferenceId: invoiceId,
        processorSubscriptionReferenceId: subscriptionKey,
        amountPaid: 1200,
        currency: "usd",
        platformCut: 240,
        paymentProcessorFee: 30,
        billingReason: "subscription_create",
        status: "COMPLETED",
      });

      // Should have sent 2 emails
      assert.equal(sendMailStub.callCount, 2);

      // Second call: artist notification should go to paymentToUser
      const artistCall = sendMailStub.getCall(1).args[1];
      assert.equal(artistCall.template, "artist-new-subscriber-announce");
      assert.equal(artistCall.message.to, "payments@manager.com");
    });

    it("should CC accounting email to artist notification if provided", async () => {
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
        accountingEmail: "accounting@artist.com",
      });

      const { user: subscriber } = await createUser({
        email: "follower@follower.com",
        emailConfirmationToken: null,
      });

      const artist = await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: "test-artist-accounting",
          userId: artistUser.id,
          enabled: true,
        },
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Tier",
        },
      });

      const subscriptionKey = "test-key-accounting-cc";
      const invoiceId = "invoice-key-accounting-cc";

      await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: subscriptionKey,
          deletedAt: null,
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 1200,
        },
      });

      await manageSubscriptionReceipt({
        processorPaymentReferenceId: invoiceId,
        processorSubscriptionReferenceId: subscriptionKey,
        amountPaid: 1200,
        currency: "usd",
        platformCut: 240,
        paymentProcessorFee: 30,
        billingReason: "subscription_create",
        status: "COMPLETED",
      });

      // Should have sent 2 emails
      assert.equal(sendMailStub.callCount, 2);

      // Second call: artist notification should have accounting email in CC
      const artistCall = sendMailStub.getCall(1).args[1];
      assert.equal(artistCall.template, "artist-new-subscriber-announce");
      assert.equal(artistCall.message.to, "artist@artist.com");
      assert.equal(artistCall.message.cc, "accounting@artist.com");
    });

    it("should send artist notification on renewal when combineSubscriptionEmails is off", async () => {
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });

      const { user: subscriber } = await createUser({
        email: "subscriber@subscriber.com",
        emailConfirmationToken: null,
      });

      const artist = await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: "test-artist",
          userId: artistUser.id,
          enabled: true,
        },
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Tier",
        },
      });

      await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: "sub-key-renewal-default",
          deletedAt: null,
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 1200,
        },
      });

      await manageSubscriptionReceipt({
        processorPaymentReferenceId: "inv-renewal-default",
        processorSubscriptionReferenceId: "sub-key-renewal-default",
        amountPaid: 1200,
        currency: "usd",
        platformCut: 240,
        paymentProcessorFee: 30,
        billingReason: "subscription_cycle",
        status: "COMPLETED",
      });

      // Both the subscriber receipt and the artist announce are sent
      assert.equal(sendMailStub.callCount, 2);
      const artistCall = sendMailStub.getCall(1).args[1];
      assert.equal(artistCall.template, "artist-new-subscriber-announce");
      assert.equal(artistCall.message.to, "artist@artist.com");
      assert.strictEqual(artistCall.locals.isNewSubscription, false);
    });

    it("should not send artist notification on renewal when combineSubscriptionEmails is on", async () => {
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
        combineSubscriptionEmails: true,
      });

      const { user: subscriber } = await createUser({
        email: "subscriber@subscriber.com",
        emailConfirmationToken: null,
      });

      const artist = await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: "test-artist",
          userId: artistUser.id,
          enabled: true,
        },
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Tier",
        },
      });

      await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: "sub-key-renewal-combined",
          deletedAt: null,
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 1200,
        },
      });

      await manageSubscriptionReceipt({
        processorPaymentReferenceId: "inv-renewal-combined",
        processorSubscriptionReferenceId: "sub-key-renewal-combined",
        amountPaid: 1200,
        currency: "usd",
        platformCut: 240,
        paymentProcessorFee: 30,
        billingReason: "subscription_cycle",
        status: "COMPLETED",
      });

      // Only the subscriber receipt is sent; the artist announce is suppressed
      assert.equal(sendMailStub.callCount, 1);
      const subscriberCall = sendMailStub.getCall(0).args[1];
      assert.equal(subscriberCall.template, "artist-subscription-receipt");
      assert.equal(subscriberCall.message.to, "subscriber@subscriber.com");
    });

    it("should still send artist notification for new subscriptions when combineSubscriptionEmails is on", async () => {
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
        combineSubscriptionEmails: true,
      });

      const { user: subscriber } = await createUser({
        email: "subscriber@subscriber.com",
        emailConfirmationToken: null,
      });

      const artist = await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: "test-artist",
          userId: artistUser.id,
          enabled: true,
        },
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Tier",
        },
      });

      await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: "sub-key-new-combined",
          deletedAt: null,
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 1200,
        },
      });

      await manageSubscriptionReceipt({
        processorPaymentReferenceId: "inv-new-combined",
        processorSubscriptionReferenceId: "sub-key-new-combined",
        amountPaid: 1200,
        currency: "usd",
        platformCut: 240,
        paymentProcessorFee: 30,
        billingReason: "subscription_create",
        status: "COMPLETED",
      });

      assert.equal(sendMailStub.callCount, 2);
      const artistCall = sendMailStub.getCall(1).args[1];
      assert.equal(artistCall.template, "artist-new-subscriber-announce");
      assert.equal(artistCall.message.to, "artist@artist.com");
      assert.strictEqual(artistCall.locals.isNewSubscription, true);
    });

    it("should pass all variables required by artist-new-subscriber-announce template", async () => {
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);

      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });
      const { user: subscriber } = await createUser({
        email: "subscriber@subscriber.com",
        emailConfirmationToken: null,
      });

      const artist = await prisma.profile.create({
        data: {
          name: "Test artist",
          urlSlug: "test-artist",
          userId: artistUser.id,
          enabled: true,
        },
      });

      const tier = await prisma.profileSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Supporter",
        },
      });

      await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: "sub-key-template-vars",
          deletedAt: null,
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 1000,
        },
      });

      await manageSubscriptionReceipt({
        processorPaymentReferenceId: "inv-template-vars",
        processorSubscriptionReferenceId: "sub-key-template-vars",
        amountPaid: 1000,
        currency: "usd",
        platformCut: 100,
        paymentProcessorFee: 29,
        billingReason: "subscription_create",
        status: "COMPLETED",
      });

      assert.equal(sendMailStub.callCount, 2);
      const artistCallData = sendMailStub.getCall(1).args[1];
      assert.equal(artistCallData.template, "artist-new-subscriber-announce");

      const locals =
        artistCallData.locals as ArtistNewSubscriberAnnounceEmailType;

      // html.pug line: if isNewSubscription / else
      assert.strictEqual(locals.isNewSubscription, true);
      // html.pug line: interval === 'MONTH' ? 'monthly' : 'yearly'
      assert.ok(locals.interval, "interval must be present");
      // html.pug line: #{artist.name}
      assert.equal(locals.artist.name, "Test artist");
      // subject.pug: artist.user.currency.toUpperCase() — crashes if user or currency is missing
      assert.ok(
        (locals.artist as any).user,
        "artist.user must be included in the query for subject.pug"
      );
      // html.pug line: #{artistUserSubscription.artistSubscriptionTier.name}
      assert.equal(
        locals.artistUserSubscription.artistSubscriptionTier.name,
        "Supporter"
      );
      // html.pug table: if transaction
      assert.ok(
        locals.transaction,
        "transaction must be present for a completed payment"
      );
      // html.pug: transaction.currency.toUpperCase()
      assert.equal(locals.transaction.currency, "usd");
      // html.pug: (transaction.amount / 100).toFixed(2)
      assert.equal(locals.transaction.amount, 1000);
      // html.pug: transaction.platformCut / 100
      assert.equal(locals.transaction.platformCut, 100);
      // html.pug: transaction.stripeCut / 100
      assert.equal(locals.transaction.stripeCut, 29);
      // html.pug: #{user.email} #{user.name}
      assert.equal(locals.user.email, "subscriber@subscriber.com");
      assert.ok(locals.user.name, "user.name must be present");
    });
  });
});
