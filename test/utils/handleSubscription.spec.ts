import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createTrackGroup, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import sinon from "sinon";
import * as sendMail from "../../src/jobs/send-mail";
import {
  handleSubscription,
  handleTrackGroupPurchase,
} from "../../src/utils/handleFinishedTransactions";
import Stripe from "stripe";

describe("handleTrackGroupPurchase", () => {
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

  it("should send out emails for track group purchase", async () => {
    const stub = sinon.spy(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
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
    await handleSubscription(
      purchaser.id,
      tier.id,
      {} as Stripe.Checkout.Session
    );

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "artist-subscription-receipt");
    assert.equal(data0.message.to, "follower@follower.com");
    assert.equal(
      data0.locals.artistUserSubscription.artistSubscriptionTierId,
      tier.id
    );
    assert.equal(data0.locals.artistUserSubscription.amount, 0);
    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "artist-new-subscriber-announce");
    assert.equal(data1.message.to, artistUser.email);
    assert.equal(
      data1.locals.artistUserSubscription.artistSubscriptionTierId,
      tier.id
    );
    assert.equal(data1.locals.artistUserSubscription.amount, 0);
  });
});
