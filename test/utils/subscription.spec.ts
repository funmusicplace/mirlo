import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";

import * as sendMailQueueModule from "../../src/queues/send-mail-queue";
import * as stripeUtils from "../../src/utils/stripe";
import {
  manageSubscriptionReceipt,
  ArtistSubscriptionReceiptEmailType,
  ArtistNewSubscriberAnnounceEmailType,
} from "../../src/utils/subscription";
import { clearTables, createTrackGroup, createUser } from "../utils";

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
          profileId: artist.id,
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
          profileSubscriptionTierId: tier.id,
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
          profileUserSubscriptionCharges: true,
        },
      });

      assert.equal(charge.length, 1);
      assert.equal(charge[0].amount, 10);
      assert.equal(
        charge[0].profileUserSubscriptionCharges[0].profileUserSubscriptionId,
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
      assert.equal(locals.currency, "usd");
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
          profileId: artist.id,
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
          profileSubscriptionTierId: tier.id,
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

    it("grants the tier's releases when a later invoice is paid, such as one after a tier switch", async () => {
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
        data: { profileId: artist.id, name: "Tier" },
      });
      const trackGroup = await createTrackGroup(artist.id);
      await prisma.subscriptionTierRelease.create({
        data: { tierId: tier.id, trackGroupId: trackGroup.id },
      });
      await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: "test-key-switched",
          userId: subscriber.id,
          profileSubscriptionTierId: tier.id,
          amount: 1200,
        },
      });

      await manageSubscriptionReceipt({
        processorPaymentReferenceId: "invoice-key-switched",
        processorSubscriptionReferenceId: "test-key-switched",
        amountPaid: 1200,
        currency: "usd",
        platformCut: 240,
        paymentProcessorFee: 30,
        status: "COMPLETED",
        billingReason: "subscription_update",
        nextBillingDate: new Date("2025-12-31"),
      });

      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: { userId: subscriber.id, trackGroupId: trackGroup.id },
      });
      assert.equal(purchase?.proGratis, true);
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
          profileId: artist.id,
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
          profileSubscriptionTierId: tier.id,
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
          profileId: artist.id,
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
          profileSubscriptionTierId: tier.id,
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
          profileId: artist.id,
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
          profileSubscriptionTierId: tier.id,
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
          profileId: artist.id,
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
          profileSubscriptionTierId: tier.id,
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
          profileId: artist.id,
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
          profileSubscriptionTierId: tier.id,
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
          profileId: artist.id,
          name: "Tier",
        },
      });

      await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: "sub-key-renewal-default",
          deletedAt: null,
          userId: subscriber.id,
          profileSubscriptionTierId: tier.id,
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
          profileId: artist.id,
          name: "Tier",
        },
      });

      await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: "sub-key-renewal-combined",
          deletedAt: null,
          userId: subscriber.id,
          profileSubscriptionTierId: tier.id,
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
          profileId: artist.id,
          name: "Tier",
        },
      });

      await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: "sub-key-new-combined",
          deletedAt: null,
          userId: subscriber.id,
          profileSubscriptionTierId: tier.id,
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
          profileId: artist.id,
          name: "Supporter",
        },
      });

      await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: "sub-key-template-vars",
          deletedAt: null,
          userId: subscriber.id,
          profileSubscriptionTierId: tier.id,
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
      // html.pug: user.email, and user.name falling back to "A supporter"
      assert.equal(locals.user.email, "subscriber@subscriber.com");
      assert.equal(locals.user.name, null);
    });
  });

  describe("tier switch invoices", () => {
    const setUpSwitch = async () => {
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
      const oldTier = await prisma.profileSubscriptionTier.create({
        data: { profileId: artist.id, name: "Old tier" },
      });
      const newTier = await prisma.profileSubscriptionTier.create({
        data: { profileId: artist.id, name: "New tier" },
      });
      const oldRow = await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: "sub-switch",
          userId: subscriber.id,
          profileSubscriptionTierId: oldTier.id,
          amount: 500,
        },
      });
      return { artist, subscriber, oldRow, newTier };
    };

    it("records a switch invoice against the tier it was switched to, receipting what was paid", async () => {
      const sendMailStub = sinon
        .stub(sendMailQueueModule.sendMailQueue, "add")
        .resolves({} as any);
      const { subscriber, newTier } = await setUpSwitch();
      const newRow = await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: "sub-switch",
          userId: subscriber.id,
          profileSubscriptionTierId: newTier.id,
          amount: 1000,
        },
      });

      await manageSubscriptionReceipt({
        processorPaymentReferenceId: "inv-switch",
        processorSubscriptionReferenceId: "sub-switch",
        amountPaid: 350,
        currency: "usd",
        platformCut: 25,
        paymentProcessorFee: 10,
        billingReason: "subscription_update",
        status: "COMPLETED",
        tierId: newTier.id,
      });

      const charge = await prisma.profileUserSubscriptionCharge.findFirst({
        where: { transaction: { stripeId: "inv-switch" } },
      });
      assert.equal(charge?.profileUserSubscriptionId, newRow.id);

      const receipt = sendMailStub.getCall(0).args[1]
        .locals as ArtistSubscriptionReceiptEmailType;
      assert.equal(receipt.artistUserSubscription.amount, 350);
      assert.equal(
        sendMailStub.callCount,
        2,
        "the artist hears about a switch even when they combine renewal emails"
      );
    });

    it("waits for a switch to be recorded before taking its invoice, so Stripe redelivers it", async () => {
      sinon.stub(sendMailQueueModule.sendMailQueue, "add").resolves({} as any);
      const { newTier } = await setUpSwitch();

      await assert.rejects(
        manageSubscriptionReceipt({
          processorPaymentReferenceId: "inv-switch-early",
          processorSubscriptionReferenceId: "sub-switch",
          amountPaid: 350,
          currency: "usd",
          platformCut: 25,
          paymentProcessorFee: 10,
          billingReason: "subscription_update",
          status: "COMPLETED",
          tierId: newTier.id,
        })
      );

      const transactions = await prisma.userTransaction.count({
        where: { stripeId: "inv-switch-early" },
      });
      assert.equal(transactions, 0);
    });
  });

  describe("handleInvoicePaid", () => {
    it("records an invoice paid entirely from credit, which has no payment intent", async () => {
      sinon.stub(sendMailQueueModule.sendMailQueue, "add").resolves({} as any);
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
        data: { profileId: artist.id, name: "Monthly tier" },
      });
      const trackGroup = await createTrackGroup(artist.id);
      await prisma.subscriptionTierRelease.create({
        data: { tierId: tier.id, trackGroupId: trackGroup.id },
      });
      const row = await prisma.profileUserSubscription.create({
        data: {
          stripeSubscriptionKey: "sub-credit",
          userId: subscriber.id,
          profileSubscriptionTierId: tier.id,
          amount: 500,
        },
      });

      const periodEnd = Math.floor(Date.UTC(2030, 0, 1) / 1000);
      sinon.stub(stripeUtils.stripe.subscriptions, "retrieve").resolves({
        id: "sub-credit",
        current_period_end: periodEnd,
        default_payment_method: "pm_default",
      } as unknown as Stripe.Response<Stripe.Subscription>);
      const intentStub = sinon.stub(
        stripeUtils.stripe.paymentIntents,
        "retrieve"
      );

      await stripeUtils.handleInvoicePaid(
        {
          id: "in-credit",
          subscription: "sub-credit",
          payment_intent: null,
          amount_paid: 0,
          currency: "usd",
          application_fee_amount: null,
          billing_reason: "subscription_update",
          subscription_details: { metadata: { tierId: String(tier.id) } },
        } as unknown as Stripe.Invoice,
        "acct_credit"
      );

      assert.equal(intentStub.callCount, 0);
      const transaction = await prisma.userTransaction.findFirst({
        where: { stripeId: "in-credit" },
        include: { profileUserSubscriptionCharges: true },
      });
      assert.equal(transaction?.amount, 0);
      assert.equal(transaction?.stripeCut, 0);
      assert.equal(
        transaction?.profileUserSubscriptionCharges[0]
          ?.profileUserSubscriptionId,
        row.id
      );
      const after = await prisma.profileUserSubscription.findUnique({
        where: { id: row.id },
      });
      assert.deepEqual(after?.nextBillingDate, new Date(periodEnd * 1000));
      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: { userId: subscriber.id, trackGroupId: trackGroup.id },
      });
      assert.equal(purchase?.proGratis, true);
    });
  });
});
