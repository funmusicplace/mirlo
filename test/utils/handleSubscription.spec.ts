import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import { handleSubscription } from "../../src/utils/handleFinishedTransactions";
import Stripe from "stripe";

describe("handleSubscription", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should register a subscription in the database", async () => {
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

    const mockSession = {
      amount_total: 1000,
      currency: "USD",
      subscription: "sub_test123",
    } as Stripe.Checkout.Session;

    await handleSubscription(purchaser.id, tier.id, mockSession);

    // Verify subscription was created with correct data
    const subscription = await prisma.artistUserSubscription.findFirst({
      where: {
        userId: purchaser.id,
        artistSubscriptionTierId: tier.id,
      },
    });

    assert.ok(subscription, "Subscription should be created");
    assert.equal(subscription.userId, purchaser.id);
    assert.equal(subscription.artistSubscriptionTierId, tier.id);
    assert.equal(subscription.amount, 1000);
    assert.equal(subscription.currency, "USD");
    assert.equal(subscription.stripeSubscriptionKey, "sub_test123");
  });
});
