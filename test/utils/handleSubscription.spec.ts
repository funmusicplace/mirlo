import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import Stripe from "stripe";

import { handleSubscription } from "../../src/utils/handleFinishedTransactions";
import { clearTables, createUser } from "../utils";

import prisma from "@mirlo/prisma";

import assert from "assert";

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
      currency: "usd",
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
    assert.equal(subscription.currency, "usd");
    assert.equal(subscription.stripeSubscriptionKey, "sub_test123");
  });

  it("should create a USER_SUBSCRIBED_TO_YOU notification with subscriptionId set", async () => {
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
      currency: "usd",
      subscription: "sub_test123",
    } as Stripe.Checkout.Session;

    await handleSubscription(purchaser.id, tier.id, mockSession);

    const subscription = await prisma.artistUserSubscription.findFirst({
      where: { userId: purchaser.id, artistSubscriptionTierId: tier.id },
    });
    assert.ok(subscription, "Subscription should be created");

    const notification = await prisma.notification.findFirst({
      where: {
        notificationType: "USER_SUBSCRIBED_TO_YOU",
        relatedUserId: purchaser.id,
      },
    });

    assert.ok(notification, "Notification should be created");
    assert.equal(
      notification.subscriptionId,
      subscription.id,
      "Notification should have subscriptionId set to the subscription id"
    );
  });

  it("should undelete existing subscription when re-subscribing to the same tier", async () => {
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

    const existing = await prisma.artistUserSubscription.create({
      data: {
        userId: purchaser.id,
        artistSubscriptionTierId: tier.id,
        amount: 500,
        currency: "usd",
        stripeSubscriptionKey: "sub_old",
        deletedAt: new Date(),
      },
    });

    const mockSession = {
      amount_total: 1000,
      currency: "usd",
      subscription: "sub_new",
    } as Stripe.Checkout.Session;

    await handleSubscription(purchaser.id, tier.id, mockSession);

    const subscriptions = await prisma.artistUserSubscription.findMany({
      where: {
        userId: purchaser.id,
        artistSubscriptionTierId: tier.id,
      },
    });

    assert.equal(
      subscriptions.length,
      1,
      "Should not create a duplicate subscription record"
    );

    const updated = subscriptions[0];
    assert.equal(updated.id, existing.id, "Should reuse the same record id");
    assert.equal(updated.deletedAt, null, "Subscription should be undeleted");
    assert.equal(updated.amount, 1000, "Amount should be updated");
    assert.equal(
      updated.stripeSubscriptionKey,
      "sub_new",
      "Stripe subscription key should be updated"
    );
  });
});
