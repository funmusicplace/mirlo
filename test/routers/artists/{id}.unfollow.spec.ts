import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "../../../prisma/prisma";
import { clearTables, createArtist, createUser } from "../../utils";

import { requestApp } from "../utils";

describe("artists/{id]/unfollow", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    beforeEach(async () => {
      try {
        await clearTables();
      } catch (e) {
        console.error(e);
      }
    });

    it("should 404 if an artist doesn't exist", async () => {
      const response = await requestApp
        .post(`artists/1/unfollow`)
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
      assert.equal(response.body.error, "User not found");
    });

    it("should unfollow an artist", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
      });

      const { user: followerUser, accessToken } = await createUser({
        email: "follower@follower.com",
      });
      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });
      const response = await requestApp
        .post(`artists/${artist.id}/unfollow`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);

      const subscription = await prisma.artistUserSubscription.findFirst({
        where: {
          userId: followerUser.id,
          artistSubscriptionTier: {
            artistId: artist.id,
          },
        },
      });

      assert.equal(subscription, null);
    });

    it("should unfollow an artist with just an email address", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
      });

      const { user: followerUser } = await createUser({
        email: "follower@follower.com",
      });
      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: { create: { name: "a tier", isDefaultTier: true } },
      });

      assert(artist.subscriptionTiers.length > 0);

      const response = await requestApp
        .post(`artists/${artist.id}/unfollow`)
        .send({
          email: followerUser.email,
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 200);

      const subscriptions = await prisma.artistUserSubscription.findMany({
        where: {
          userId: followerUser.id,
        },
      });

      assert.equal(subscriptions.length, 0);
    });
  });
});
