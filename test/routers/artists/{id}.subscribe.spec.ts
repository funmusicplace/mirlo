import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import { describe, it } from "mocha";
import sinon from "sinon";

import { getPaymentProcessor } from "../../../src/utils/payments/PaymentProcessor";
import { stripe } from "../../../src/utils/stripe";
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

  afterEach(() => {
    sinon.restore();
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
      await prisma.profileUserSubscription.create({
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

      const subscriptions = await prisma.profileUserSubscription.findMany({
        where: {
          artistSubscriptionTierId: newTierId,
          userId: followerUser.id,
        },
      });
      assert.equal(subscriptions.length, 0);
    });
  });

  describe("DELETE", () => {
    it("should return 404 when the user has no subscription", async () => {
      const { artist, followerAccessToken } = await createTestData();

      const response = await requestApp
        .delete(`artists/${artist.id}/subscribe`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${followerAccessToken}`]);

      assert.equal(response.status, 404);
    });

    it("keeps a paid subscription active until period end rather than removing it", async () => {
      const { artist, followerUser, followerAccessToken } =
        await createTestData();
      const paidTier = artist.subscriptionTiers![1]; // Tier 2, minAmount 4

      const subscription = await prisma.profileUserSubscription.create({
        data: {
          artistSubscriptionTierId: paidTier.id,
          userId: followerUser.id,
          amount: 500,
          stripeSubscriptionKey: "sub_paid_123",
        },
      });

      const response = await requestApp
        .delete(`artists/${artist.id}/subscribe`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${followerAccessToken}`]);

      assert.equal(response.status, 200);

      // The subscription is still active (deletedAt null, so the soft-delete
      // read filter still returns it), with the reason recorded now and the
      // Stripe key kept so the customer.subscription.deleted webhook — which
      // fires at period end — can match it and finally set deletedAt.
      const after = await prisma.profileUserSubscription.findFirst({
        where: { id: subscription.id },
      });
      assert.ok(after, "subscription should still be active until period end");
      assert.equal(after?.deleteReason, "USER_CANCELLED");
      assert.equal(after?.stripeSubscriptionKey, "sub_paid_123");
    });

    it("removes a free subscription immediately", async () => {
      const { artist, followerUser, followerAccessToken } =
        await createTestData();
      const freeTier = artist.subscriptionTiers![0]; // default tier, no Stripe key

      const subscription = await prisma.profileUserSubscription.create({
        data: {
          artistSubscriptionTierId: freeTier.id,
          userId: followerUser.id,
          amount: 0,
        },
      });

      const response = await requestApp
        .delete(`artists/${artist.id}/subscribe`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${followerAccessToken}`]);

      assert.equal(response.status, 200);

      // A free tier has no paid period to honour, so it is soft-deleted now
      // and no longer appears as an active subscription.
      const after = await prisma.profileUserSubscription.findFirst({
        where: { id: subscription.id },
      });
      assert.equal(after, null, "free subscription should no longer be active");
    });

    it("the payment processor asks Stripe to cancel at period end on the connected account", async () => {
      // Exercised directly (in-process) so we can assert the Stripe params —
      // the HTTP handler above runs in a separate container where stubs don't
      // apply. This is the one place the Stripe subscription SDK is touched for
      // cancellation (StripePaymentProcessor.cancelSubscription).
      const updateStub = sinon
        .stub(stripe.subscriptions, "update")
        .resolves({} as any);

      await getPaymentProcessor().cancelSubscription({
        subscriptionKey: "sub_paid_456",
        accountId: "23",
        atPeriodEnd: true,
      });

      assert.equal(updateStub.calledOnce, true);
      assert.equal(updateStub.getCall(0).args[0], "sub_paid_456");
      assert.deepEqual(updateStub.getCall(0).args[1], {
        cancel_at_period_end: true,
      });
      // Connected-account subscriptions are cancelled on the artist's account
      assert.deepEqual(updateStub.getCall(0).args[2], { stripeAccount: "23" });
    });
  });
});
