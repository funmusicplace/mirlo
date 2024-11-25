import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import sinon from "sinon";
import * as sendMail from "../../src/jobs/send-mail";

import { manageSubscriptionReceipt } from "../../src/utils/subscription";

describe("subscription", () => {
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

  describe("manageSubscriptionReceipt", () => {
    it("should send out an email on receipt of a subscription charge", async () => {
      const stub = sinon.spy(sendMail, "default");

      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });

      const { user: subscriber } = await createUser({
        email: "follower@follower.com",
        emailConfirmationToken: null,
      });

      const artist = await prisma.artist.create({
        data: {
          name: "Test artist",
          urlSlug: "test-artist",
          userId: artistUser.id,
          enabled: true,
        },
      });

      const tier = await prisma.artistSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Tier",
        },
      });

      const subscriptionKey = "test-key";
      const invoiceId = "invoice-key";

      const subscription = await prisma.artistUserSubscription.create({
        data: {
          stripeSubscriptionKey: subscriptionKey,
          deletedAt: null,
          userId: subscriber.id,
          artistSubscriptionTierId: tier.id,
          amount: 10,
        },
      });

      await manageSubscriptionReceipt({
        paymentProcessor: "stripe",
        processorPaymentReferenceId: invoiceId,
        processorSubscriptionReferenceId: subscriptionKey,
        amountPaid: 10,
        currency: "usd",
      });

      const charge = await prisma.artistUserSubscriptionCharge.findMany({
        where: {
          stripeInvoiceId: invoiceId,
        },
      });

      assert.equal(charge.length, 1);
      assert.equal(charge[0].amountPaid, 10);
      assert.equal(charge[0].paymentProcessor, "stripe");
      assert.equal(charge[0].artistUserSubscriptionId, subscription.id);

      assert.equal(stub.calledOnce, true);
      const data0 = stub.getCall(0).args[0].data;
      assert.equal(data0.template, "artist-subscription-receipt");
      assert.equal(data0.message.to, "follower@follower.com");
      assert.equal(
        data0.locals.artistUserSubscription.artistSubscriptionTierId,
        tier.id
      );
      assert.equal(data0.locals.artistUserSubscription.amount, 10);
    });
  });
});
