import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();

import { clearTables, createArtist, createUser } from "../../utils";
import { describe, it } from "mocha";
import { requestApp } from "../utils";
import prisma from "@mirlo/prisma";

let createTestData = async (stripeAccountId: string | null = "23") => {
  const { user: artistUser, accessToken: artistAccessToken } = await createUser(
    {
      email: "artist@example.com",
      stripeAccountId: stripeAccountId,
    }
  );

  const { user: followerUser, accessToken: followerAccessToken } =
    await createUser({
      email: "follower@example.com",
    });

  const artist = await createArtist(artistUser.id, {
    name: "Test artist",
    userId: artistUser.id,
    enabled: true,
    subscriptionTiers: {
      create: [
        { name: "Tier 1", isDefaultTier: true },
        { name: "Tier 2", currency: "eur", minAmount: 4 },
      ],
    },
  });

  return {
    artist,
    artistUser,
    artistAccessToken,
    followerUser,
    followerAccessToken,
  };
};

describe("artists/{id}/subscribe", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should return 404 when tier doesn't exist", async () => {
      const response = await requestApp
        .post("artists/1/subscribe")
        .send({
          tierId: 0,
          email: "user@example.com",
          amount: 42,
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
    });

    it("should return 400 when artist hasn't set up Stripe", async () => {
      const { artistUser, artist, followerUser } = await createTestData(null);

      const response = await requestApp
        .post(`artists/${artistUser.id}/subscribe`)
        .send({
          tierId: artist.subscriptionTiers![0].id,
          email: followerUser.email,
          amount: 42,
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
    });

    it("should return Stripe checkout URL", async () => {
      const { artistUser, artist, followerUser } = await createTestData();

      const response = await requestApp
        .post(`artists/${artistUser.id}/subscribe`)
        .send({
          tierId: artist.subscriptionTiers![0].id,
          email: followerUser.email,
          amount: 42,
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(
        JSON.parse(response.text).sessionUrl,
        "https://checkout.stripe.com/pay/c/cs_test_a1YS1URlnyQCN5fUUduORoQ7Pw41PJqDWkIVQCpJPqkfIhd6tVY8XB1OLY"
      );
    });

    it("should remove user from old subscription tier", async () => {
      const { artistUser, artist, followerUser, followerAccessToken } =
        await createTestData();
      await prisma.artistUserSubscription.create({
        data: {
          artistSubscriptionTierId: artist.subscriptionTiers![0].id,
          userId: followerUser.id,
          amount: 3,
        },
      });
      const newTierId = artist.subscriptionTiers![1].id;
      await requestApp
        .post(`artists/${artistUser.id}/subscribe`)
        .send({
          tierId: newTierId,
          email: followerUser.email,
          amount: 0,
        })
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${followerAccessToken}`]);

      const subscriptions = await prisma.artistUserSubscription.findMany({
        where: {
          artistSubscriptionTierId: newTierId,
          userId: followerUser.id,
        },
      });
      assert.equal(subscriptions.length, 0);
    });
  });
});
