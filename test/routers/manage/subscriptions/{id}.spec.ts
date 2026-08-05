import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createTier,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

describe("PUT manage/subscriptions/{subscriptionId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should return 401 when not logged in", async () => {
    const response = await requestApp
      .put("manage/subscriptions/1")
      .set("Accept", "application/json");
    assert.equal(response.statusCode, 401);
  });

  it("should return 404 for a subscription that doesn't belong to the logged-in user", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
      stripeAccountId: "acct_manage_pm_404",
    });
    const { user: owner } = await createUser({ email: "owner@test.com" });
    const { accessToken: otherAccessToken } = await createUser({
      email: "other@test.com",
    });
    const artist = await createArtist(artistUser.id);
    const tier = await createTier(artist.id, { minAmount: 500 });

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        profileSubscriptionTierId: tier.id,
        userId: owner.id,
        amount: 500,
        stripeSubscriptionKey: "sub_manage_pm_404",
      },
    });

    const response = await requestApp
      .put(`manage/subscriptions/${subscription.id}`)
      .set("Cookie", [`jwt=${otherAccessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should return 400 for a subscription with no payment method (e.g. a free tier)", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
      stripeAccountId: "acct_manage_pm_400",
    });
    const { user: buyer, accessToken } = await createUser({
      email: "buyer@test.com",
    });
    const artist = await createArtist(artistUser.id);
    const tier = await createTier(artist.id, { minAmount: 0 });

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        profileSubscriptionTierId: tier.id,
        userId: buyer.id,
        amount: 0,
      },
    });

    const response = await requestApp
      .put(`manage/subscriptions/${subscription.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);
  });

  it("should return 200 with a SetupIntent clientSecret for the user's own paid subscription", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
      stripeAccountId: "acct_manage_pm_200",
    });
    const { user: buyer, accessToken } = await createUser({
      email: "buyer@test.com",
    });
    const artist = await createArtist(artistUser.id);
    const tier = await createTier(artist.id, { minAmount: 500 });

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        profileSubscriptionTierId: tier.id,
        userId: buyer.id,
        amount: 500,
        stripeSubscriptionKey: "sub_manage_pm_200",
      },
    });

    // This request goes over HTTP to the separate api-test server process, so
    // it reaches the real stripe-mock service rather than any in-process
    // sinon stub — assert on the shape of a SetupIntent secret.
    const response = await requestApp
      .put(`manage/subscriptions/${subscription.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.ok(
      response.body.result.clientSecret?.startsWith("seti_"),
      "clientSecret should be a SetupIntent secret"
    );
    assert.equal(response.body.result.stripeAccountId, "acct_manage_pm_200");
  });
});
