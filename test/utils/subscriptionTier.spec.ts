import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { registerSubscription } from "../../src/utils/subscriptionTier";
import { clearTables, createArtist, createUser } from "../utils";

describe("registerSubscription", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("converts an existing free follow-tier row instead of creating a second row for the same artist", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@example.com",
    });
    const { user: follower } = await createUser({
      email: "follower@example.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test artist",
      userId: artistUser.id,
      enabled: true,
      subscriptionTiers: {
        create: [
          { name: "Follow", isDefaultTier: true },
          { name: "Paid tier", minAmount: 4 },
        ],
      },
    });
    const freeTier = artist.subscriptionTiers![0];
    const paidTier = artist.subscriptionTiers![1];

    const freeSubscription = await prisma.profileUserSubscription.create({
      data: {
        profileSubscriptionTierId: freeTier.id,
        userId: follower.id,
        amount: 0,
      },
    });

    await registerSubscription({
      tierId: paidTier.id,
      userId: follower.id,
      amount: 500,
      paymentProcessorKey: "sub_paid_new",
    });

    const rows = await prisma.profileUserSubscription.findMany({
      where: {
        userId: follower.id,
        profileSubscriptionTier: { profileId: artist.id },
      },
    });

    assert.equal(
      rows.length,
      1,
      "should still have exactly one row for this user+artist, not a duplicate"
    );
    assert.equal(rows[0].id, freeSubscription.id, "should reuse the same row");
    assert.equal(rows[0].profileSubscriptionTierId, paidTier.id);
    assert.equal(rows[0].stripeSubscriptionKey, "sub_paid_new");
    assert.equal(rows[0].amount, 500);
  });

  it("creates a new row when the user has no existing subscription for this artist", async () => {
    const { user: artistUser } = await createUser({
      email: "artist2@example.com",
    });
    const { user: follower } = await createUser({
      email: "follower2@example.com",
    });

    const artist = await createArtist(artistUser.id, {
      name: "Test artist 2",
      userId: artistUser.id,
      enabled: true,
      subscriptionTiers: {
        create: [{ name: "Paid tier", minAmount: 4 }],
      },
    });
    const paidTier = artist.subscriptionTiers![0];

    await registerSubscription({
      tierId: paidTier.id,
      userId: follower.id,
      amount: 500,
      paymentProcessorKey: "sub_paid_fresh",
    });

    const rows = await prisma.profileUserSubscription.findMany({
      where: { userId: follower.id, profileSubscriptionTierId: paidTier.id },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].stripeSubscriptionKey, "sub_paid_fresh");
  });

  it("does not touch a free row belonging to a different artist", async () => {
    const { user: artistUser } = await createUser({
      email: "artist3@example.com",
    });
    const { user: otherArtistUser } = await createUser({
      email: "otherartist3@example.com",
    });
    const { user: follower } = await createUser({
      email: "follower3@example.com",
    });

    const otherArtist = await createArtist(otherArtistUser.id, {
      name: "Other artist",
      userId: otherArtistUser.id,
      enabled: true,
      subscriptionTiers: {
        create: [{ name: "Follow", isDefaultTier: true }],
      },
    });
    const otherArtistFreeTier = otherArtist.subscriptionTiers![0];

    const artist = await createArtist(artistUser.id, {
      name: "Test artist 3",
      userId: artistUser.id,
      enabled: true,
      subscriptionTiers: {
        create: [{ name: "Paid tier", minAmount: 4 }],
      },
    });
    const paidTier = artist.subscriptionTiers![0];

    const unrelatedFreeSubscription =
      await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: otherArtistFreeTier.id,
          userId: follower.id,
          amount: 0,
        },
      });

    await registerSubscription({
      tierId: paidTier.id,
      userId: follower.id,
      amount: 500,
      paymentProcessorKey: "sub_paid_unrelated",
    });

    const unrelatedAfter = await prisma.profileUserSubscription.findFirst({
      where: { id: unrelatedFreeSubscription.id },
    });
    assert.ok(
      unrelatedAfter,
      "unrelated artist's free row should be untouched"
    );
    assert.equal(unrelatedAfter?.stripeSubscriptionKey, null);

    const paidRows = await prisma.profileUserSubscription.findMany({
      where: { userId: follower.id, profileSubscriptionTierId: paidTier.id },
    });
    assert.equal(paidRows.length, 1);
    assert.equal(paidRows[0].stripeSubscriptionKey, "sub_paid_unrelated");
  });
});
