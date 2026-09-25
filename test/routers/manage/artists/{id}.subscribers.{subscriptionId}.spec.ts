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

const createTestData = async () => {
  const { user: artistUser, accessToken } = await createUser({
    email: "artist@example.com",
    stripeAccountId: "acct_artist_cancel",
  });
  const { user: supporter } = await createUser({
    email: "supporter@example.com",
  });
  const artist = await createArtist(artistUser.id);
  const tier = await createTier(artist.id, { minAmount: 500 });

  return { artist, tier, supporter, accessToken };
};

describe("manage/artists/{artistId}/subscribers/{subscriptionId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("DELETE", () => {
    it("cancels a paid subscription at period end and records that the artist cancelled it", async () => {
      const { artist, tier, supporter, accessToken } = await createTestData();
      const subscription = await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: tier.id,
          userId: supporter.id,
          amount: 500,
          stripeSubscriptionKey: "sub_artist_cancel",
        },
      });
      const response = await requestApp
        .delete(`manage/artists/${artist.id}/subscribers/${subscription.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const after = await prisma.profileUserSubscription.findFirst({
        where: { id: subscription.id },
      });
      assert.ok(after, "stays active until the paid period ends");
      assert.equal(after?.deleteReason, "ARTIST_CANCELLED");
    });

    it("removes a free subscription immediately", async () => {
      const { artist, tier, supporter, accessToken } = await createTestData();
      const subscription = await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: tier.id,
          userId: supporter.id,
          amount: 0,
        },
      });

      const response = await requestApp
        .delete(`manage/artists/${artist.id}/subscribers/${subscription.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const after = await prisma.profileUserSubscription.findFirst({
        where: { id: subscription.id },
      });
      assert.equal(after, null);
    });

    it("returns 404 for a subscription to a different artist", async () => {
      const { artist, supporter, accessToken } = await createTestData();
      const { user: otherArtistUser } = await createUser({
        email: "other@example.com",
      });
      const otherArtist = await createArtist(otherArtistUser.id, {
        urlSlug: "other-artist",
      });
      const otherTier = await createTier(otherArtist.id, { minAmount: 500 });
      const subscription = await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: otherTier.id,
          userId: supporter.id,
          amount: 500,
          stripeSubscriptionKey: "sub_other_artist",
        },
      });
      const response = await requestApp
        .delete(`manage/artists/${artist.id}/subscribers/${subscription.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      const after = await prisma.profileUserSubscription.findFirst({
        where: { id: subscription.id },
      });
      assert.equal(after?.deleteReason, null);
    });

    it("rejects a user who doesn't manage the artist", async () => {
      const { artist, tier, supporter } = await createTestData();
      const { accessToken: strangerToken } = await createUser({
        email: "stranger@example.com",
      });
      const subscription = await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: tier.id,
          userId: supporter.id,
          amount: 500,
          stripeSubscriptionKey: "sub_stranger",
        },
      });

      const response = await requestApp
        .delete(`manage/artists/${artist.id}/subscribers/${subscription.id}`)
        .set("Cookie", [`jwt=${strangerToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });
  });
});
