import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createArtist,
  createTier,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

describe("PUT manage/subscriptions/{subscriptionId}/tier", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should return 401 when not logged in", async () => {
    const response = await requestApp
      .put("manage/subscriptions/1/tier")
      .send({ tierId: 1 })
      .set("Accept", "application/json");
    assert.equal(response.statusCode, 401);
  });

  it("should return 404 for a subscription that doesn't belong to the logged-in user", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
      stripeAccountId: "acct_switch_tier_404",
    });
    const { user: owner } = await createUser({ email: "owner@test.com" });
    const { accessToken: otherAccessToken } = await createUser({
      email: "other@test.com",
    });
    const artist = await createArtist(artistUser.id);
    const tier = await createTier(artist.id, { minAmount: 500 });
    const newTier = await createTier(artist.id, { minAmount: 1000 });

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        profileSubscriptionTierId: tier.id,
        userId: owner.id,
        amount: 500,
        stripeSubscriptionKey: "sub_switch_tier_404",
      },
    });

    const response = await requestApp
      .put(`manage/subscriptions/${subscription.id}/tier`)
      .send({ tierId: newTier.id })
      .set("Cookie", [`jwt=${otherAccessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should move the user's own subscription to the new tier", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
      stripeAccountId: "acct_switch_tier_ok",
    });
    const { user: buyer, accessToken } = await createUser({
      email: "buyer@test.com",
    });
    const artist = await createArtist(artistUser.id);
    const tier = await createTier(artist.id, { minAmount: 500 });
    const newTier = await createTier(artist.id, { minAmount: 1000 });

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        profileSubscriptionTierId: tier.id,
        userId: buyer.id,
        amount: 500,
        stripeSubscriptionKey: "sub_switch_tier_ok",
      },
    });

    const response = await requestApp
      .put(`manage/subscriptions/${subscription.id}/tier`)
      .send({ tierId: newTier.id })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    const after = await prisma.profileUserSubscription.findFirst({
      where: { id: subscription.id },
    });
    assert.equal(after?.profileSubscriptionTierId, newTier.id);
    assert.equal(after?.amount, 1000);
  });
});
