import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import sinon from "sinon";
import * as sendMail from "../../src/jobs/send-mail";

import { manageSubscriptionReceipt } from "../../src/utils/subscription";
import { ArtistSubscriptionReceiptEmailType } from "../../src/utils/handleFinishedTransactions";
import * as sendMailQueueModule from "../../src/queues/send-mail-queue";

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
        processorPaymentReferenceId: invoiceId,
        processorSubscriptionReferenceId: subscriptionKey,
        amountPaid: 10,
        currency: "usd",
        platformCut: 2,
        paymentProcessorFee: 0.3,
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

      assert.equal(sendMailStub.calledOnce, true);
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
  });
});
