import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { unfollowToken } from "../../../src/utils/unfollowToken";
import { clearTables, createProfile, createUser } from "../../utils";
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

    it("should 403 without a login or unsubscribe token", async () => {
      const response = await requestApp
        .post(`artists/1/unfollow`)
        .set("Accept", "application/json");

      assert.equal(response.status, 403);
    });

    it("should unfollow an artist", async () => {
      const { user: profileOwner } = await createUser({
        email: "test@test.com",
      });

      const { user: followerUser, accessToken } = await createUser({
        email: "follower@follower.com",
      });
      const profile = await createProfile(profileOwner.id);
      const response = await requestApp
        .post(`artists/${profile.id}/unfollow`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);

      const subscription = await prisma.profileUserSubscription.findFirst({
        where: {
          userId: followerUser.id,
          profileSubscriptionTier: {
            profileId: profile.id,
          },
        },
      });

      assert.equal(subscription, null);
    });

    it("turns off receiveEmail for a paid subscription instead of deleting it", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
      });

      const { user: followerUser, accessToken } = await createUser({
        email: "follower@follower.com",
      });
      const artist = await createProfile(artistUser.id, {
        subscriptionTiers: {
          create: [
            { name: "Follow", isDefaultTier: true },
            { name: "Paid", minAmount: 500 },
          ],
        },
      });
      const paidTier = artist.subscriptionTiers.find((t) => !t.isDefaultTier)!;

      const subscription = await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: paidTier.id,
          userId: followerUser.id,
          amount: 500,
          stripeSubscriptionKey: "sub_paid_email_opt_out",
        },
      });

      const response = await requestApp
        .post(`artists/${artist.id}/unfollow`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);

      const after = await prisma.profileUserSubscription.findFirst({
        where: { id: subscription.id },
      });
      assert.ok(after, "paid subscription should not be removed");
      assert.equal(after?.receiveEmail, false);
      assert.equal(after?.stripeSubscriptionKey, "sub_paid_email_opt_out");
    });

    it("should not unfollow with an email address and a bad token", async () => {
      const { user: profileOwner } = await createUser({
        email: "test@test.com",
      });
      const { user: followerUser } = await createUser({
        email: "follower@follower.com",
      });
      const profile = await createProfile(profileOwner.id, {
        subscriptionTiers: { create: { name: "a tier", isDefaultTier: true } },
      });
      await prisma.profileUserSubscription.create({
        data: {
          userId: followerUser.id,
          profileSubscriptionTierId: profile.subscriptionTiers[0].id,
          amount: 0,
        },
      });

      for (const token of [
        undefined,
        "nope",
        unfollowToken(followerUser.email, profile.id + 1),
        unfollowToken("someone@else.com", profile.id),
      ]) {
        const response = await requestApp
          .post(`artists/${profile.id}/unfollow`)
          .send({ email: followerUser.email, token })
          .set("Accept", "application/json");
        assert.equal(response.status, 403);
      }

      const subscriptions = await prisma.profileUserSubscription.findMany({
        where: { userId: followerUser.id },
      });
      assert.equal(subscriptions.length, 1);
    });

    it("should unfollow an artist with an email address and its token", async () => {
      const { user: profileOwner } = await createUser({
        email: "test@test.com",
      });

      const { user: followerUser } = await createUser({
        email: "follower@follower.com",
      });
      const profile = await createProfile(profileOwner.id, {
        subscriptionTiers: { create: { name: "a tier", isDefaultTier: true } },
      });

      assert(profile.subscriptionTiers.length > 0);
      await prisma.profileUserSubscription.create({
        data: {
          userId: followerUser.id,
          profileSubscriptionTierId: profile.subscriptionTiers[0].id,
          amount: 0,
        },
      });

      const response = await requestApp
        .post(`artists/${profile.id}/unfollow`)
        .send({
          email: followerUser.email,
          token: unfollowToken(followerUser.email, profile.id),
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 200);

      const subscriptions = await prisma.profileUserSubscription.findMany({
        where: {
          userId: followerUser.id,
        },
      });

      assert.equal(subscriptions.length, 0);
    });
  });
});
