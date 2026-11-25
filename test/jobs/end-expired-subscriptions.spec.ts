import * as dotenv from "dotenv";

dotenv.config();
import assert from "node:assert";

import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import endExpiredSubscriptions from "../../src/jobs/tasks/end-expired-subscriptions";
import { clearTables, createArtist, createTier, createUser } from "../utils";

const yesterday = () => new Date(Date.now() - 86400000);
const tomorrow = () => new Date(Date.now() + 86400000);

describe("end-expired-subscriptions", () => {
  beforeEach(async () => {
    await clearTables();
  });

  const setUp = async () => {
    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const { user: fan } = await createUser({ email: "fan@test.com" });
    const artist = await createArtist(artistUser.id);
    const followTier = await createTier(artist.id, { isDefaultTier: true });
    const paidTier = await createTier(artist.id, { minAmount: 500 });
    return { fan, followTier, paidTier };
  };

  it("moves an expired free subscription to the follow tier", async () => {
    const { fan, followTier, paidTier } = await setUp();
    const promo = await prisma.profileUserSubscription.create({
      data: {
        userId: fan.id,
        profileSubscriptionTierId: paidTier.id,
        amount: 0,
        expiresAt: yesterday(),
      },
    });

    await endExpiredSubscriptions();

    const row = await prisma.profileUserSubscription.findFirstOrThrow({
      where: { id: promo.id },
    });
    assert.equal(row.profileSubscriptionTierId, followTier.id);
    assert.equal(row.expiresAt, null);
  });

  it("ends the promo when they already follow the artist", async () => {
    const { fan, followTier, paidTier } = await setUp();
    await prisma.profileUserSubscription.create({
      data: {
        userId: fan.id,
        profileSubscriptionTierId: followTier.id,
        amount: 0,
      },
    });
    const promo = await prisma.profileUserSubscription.create({
      data: {
        userId: fan.id,
        profileSubscriptionTierId: paidTier.id,
        amount: 0,
        expiresAt: yesterday(),
      },
    });

    await endExpiredSubscriptions();

    const active = await prisma.profileUserSubscription.findMany({
      where: { userId: fan.id },
    });
    assert.deepEqual(
      active.map((r) => r.profileSubscriptionTierId),
      [followTier.id]
    );
    assert.notEqual(promo.id, active[0].id);
  });

  it("leaves unexpired and paid subscriptions alone", async () => {
    const { fan, paidTier } = await setUp();
    const { user: payer } = await createUser({ email: "payer@test.com" });
    await prisma.profileUserSubscription.create({
      data: {
        userId: fan.id,
        profileSubscriptionTierId: paidTier.id,
        amount: 0,
        expiresAt: tomorrow(),
      },
    });
    await prisma.profileUserSubscription.create({
      data: {
        userId: payer.id,
        profileSubscriptionTierId: paidTier.id,
        amount: 500,
        stripeSubscriptionKey: "sub_123",
        expiresAt: yesterday(),
      },
    });

    await endExpiredSubscriptions();

    assert.equal(
      await prisma.profileUserSubscription.count({
        where: { profileSubscriptionTierId: paidTier.id },
      }),
      2
    );
  });
});
