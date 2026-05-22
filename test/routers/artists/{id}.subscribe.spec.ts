import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import { describe, it } from "mocha";

import { clearTables, createArtist, createUser } from "../../utils";
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
        { name: "Tier 2", minAmount: 4 },
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

    it("returns a hosted Stripe checkout sessionUrl by default for external callers", async () => {
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
      const body = JSON.parse(response.text);
      assert.ok(
        "sessionUrl" in body,
        `expected sessionUrl key in response, got: ${response.text}`
      );
      assert.ok(
        !("clientSecret" in body),
        `hosted response should not include clientSecret, got: ${response.text}`
      );
      assert.ok(
        typeof body.stripeAccountId === "string" &&
          body.stripeAccountId.length > 0,
        `expected stripeAccountId in response, got: ${response.text}`
      );
    });

    it("returns an embedded clientSecret when the caller opts in (#1168)", async () => {
      const { artistUser, artist, followerUser } = await createTestData();

      const response = await requestApp
        .post(`artists/${artistUser.id}/subscribe`)
        .send({
          tierId: artist.subscriptionTiers![0].id,
          email: followerUser.email,
          amount: 42,
          embedded: true,
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      const body = JSON.parse(response.text);
      // stripe-mock doesn't populate client_secret for embedded sessions in
      // its fixture, but real Stripe does. Asserting the field is present
      // (even null) verifies the embedded branch was taken
      assert.ok(
        "clientSecret" in body,
        `expected clientSecret key in response, got: ${response.text}`
      );
      assert.ok(
        !("sessionUrl" in body),
        `embedded response should not include sessionUrl, got: ${response.text}`
      );
      assert.ok(
        typeof body.stripeAccountId === "string" &&
          body.stripeAccountId.length > 0,
        `expected stripeAccountId in response, got: ${response.text}`
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
