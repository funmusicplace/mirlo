import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";

import {
  initiatePayment,
  initiateSubscription,
} from "../../src/utils/payments/purchase";
import * as stripeUtils from "../../src/utils/stripe";
import * as terminalUtils from "../../src/utils/stripe/terminal";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createMerch,
  createTier,
  createUser,
} from "../utils";

import { requestApp } from "./utils";

import prisma from "@mirlo/prisma";

describe("purchase", () => {
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

  describe("POST /v1/purchase", () => {
    it("should return 400 when artistId is missing", async () => {
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const response = await requestApp
        .post("purchase")
        .send({ items: [{ type: "tip", amount: 500 }] })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 400);
    });

    it("should return 400 when items array is empty", async () => {
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const response = await requestApp
        .post("purchase")
        .send({ artistId: 1, items: [] })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 400);
    });

    it("should return 400 when subscription is combined with other items", async () => {
      const { user, accessToken } = await createUser({
        email: "buyer@test.com",
      });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id);
      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
          items: [
            { type: "subscription", tierId: tier.id },
            { type: "tip", amount: 500 },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 400);
    });

    it("should return 400 when subscription is attempted without a readerId", async () => {
      const { user, accessToken } = await createUser({
        email: "buyer@test.com",
      });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id, {
        minAmount: 500,
        defaultAmount: 1000,
      });
      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
          items: [{ type: "subscription", tierId: tier.id }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 400);
    });

    it("should return 404 when subscription tier does not exist", async () => {
      const { user, accessToken } = await createUser({
        email: "buyer@test.com",
      });
      const artist = await createArtist(user.id);
      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
          readerId: "tmr_test",
          items: [{ type: "subscription", tierId: 99999 }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404);
    });

    it("should return 400 for a tip with zero or missing amount", async () => {
      const { user, accessToken } = await createUser({
        email: "buyer@test.com",
      });
      const artist = await createArtist(user.id);
      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
          items: [{ type: "tip", amount: 0 }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 400);
    });

    it("should return 404 when trackGroup does not belong to the given artist", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });
      const { user: otherUser } = await createUser({ email: "other@test.com" });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const otherArtist = await createArtist(otherUser.id, {
        urlSlug: "other-artist",
      });
      const tgFromOther = await createTrackGroup(otherArtist.id, {
        minPrice: 1000,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
          items: [{ type: "trackGroup", id: tgFromOther.id }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404);
    });

    it("should return 200 with redirectUrl for a free trackGroup when user is logged in", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });
      const { user: buyer, accessToken } = await createUser({
        email: "buyer@test.com",
      });
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 0 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
          items: [{ type: "trackGroup", id: tg.id }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.redirectUrl, "should return a redirectUrl");
      assert.ok(response.body.redirectUrl.includes("download"));

      const purchase = await prisma.userTrackGroupPurchase.findFirst({
        where: { userId: buyer.id, trackGroupId: tg.id },
      });
      assert.ok(purchase, "purchase record should be created in DB");
    });

    it("should return 200 with clientSecret for a paid online trackGroup purchase", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_tg_online",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 1000 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
          items: [{ type: "trackGroup", id: tg.id, price: "1000" }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.clientSecret);
    });

    it("should return 200 with clientSecret for an online tip", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_tip_test",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
          items: [{ type: "tip", amount: 500 }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.clientSecret);
    });

    it("should return 200 with clientSecret for an online merch purchase", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_merch_test",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const merch = await createMerch(artist.id, {
        isPublic: true,
        minPrice: 800,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
          items: [{ type: "merch", id: merch.id, quantity: 1 }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.clientSecret);
    });
  });

  // These tests call initiatePayment / initiateSubscription directly so sinon stubs
  // work (same process), without going through the HTTP API container.
  describe("initiatePayment (direct)", () => {
    it("should return paymentIntentId for a terminal trackGroup purchase", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_tg_terminal",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 1000 });

      sinon.stub(stripeUtils.stripe.accounts, "retrieve").resolves({
        id: "acct_tg_terminal",
        default_currency: "usd",
        country: "US",
      } as unknown as Stripe.Response<Stripe.Account>);

      sinon.stub(stripeUtils.stripe.paymentIntents, "create").resolves({
        id: "pi_terminal_tg",
        client_secret: "secret",
      } as unknown as Stripe.Response<Stripe.PaymentIntent>);

      sinon.stub(terminalUtils, "processPaymentOnReader").resolves();

      const result = await initiatePayment({
        readerId: "tmr_test",
        artistId: artist.id,
        items: [
          { type: "trackGroup", id: String(tg.id), quantity: 1, amount: 1000 },
        ],
        userEmail: buyer.email,
        userId: String(buyer.id),
      });

      assert.ok(
        "paymentIntentId" in result,
        "result should have paymentIntentId"
      );
      assert.equal(
        (result as { paymentIntentId: string }).paymentIntentId,
        "pi_terminal_tg"
      );
    });
  });

  describe("initiateSubscription (direct)", () => {
    it("should return setupIntentId for a terminal subscription", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_terminal",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const tier = await createTier(artist.id, {
        minAmount: 500,
        defaultAmount: 1000,
      });

      sinon.stub(stripeUtils.stripe.accounts, "retrieve").resolves({
        id: "acct_sub_terminal",
        default_currency: "usd",
        country: "US",
      } as unknown as Stripe.Response<Stripe.Account>);

      sinon.stub(stripeUtils.stripe.setupIntents, "create").resolves({
        id: "seti_sub_terminal",
      } as unknown as Stripe.Response<Stripe.SetupIntent>);

      sinon.stub(terminalUtils, "processSetupIntentOnReader").resolves();

      const result = await initiateSubscription({
        readerId: "tmr_test",
        artistId: artist.id,
        tierId: tier.id,
        amount: 1000,
        userEmail: buyer.email,
        userId: String(buyer.id),
      });

      assert.equal(result.setupIntentId, "seti_sub_terminal");
    });
  });

  describe("GET /v1/purchase/:id", () => {
    it("should return 400 when stripeAccountId query param is missing", async () => {
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const response = await requestApp
        .get("purchase/pi_test123")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 400);
    });

    it("should return the PaymentIntent status for a pi_ prefixed id", async () => {
      const { accessToken } = await createUser({ email: "buyer@test.com" });

      const response = await requestApp
        .get("purchase/pi_status_test")
        .query({ stripeAccountId: "acct_test" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.result.id, "should return a result id");
      assert.ok(response.body.result.status, "should return a result status");
    });

    it("should return the SetupIntent status for a seti_ prefixed id", async () => {
      const { accessToken } = await createUser({ email: "buyer@test.com" });

      const response = await requestApp
        .get("purchase/seti_status_test")
        .query({ stripeAccountId: "acct_test" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.result.id, "should return a result id");
      assert.ok(response.body.result.status, "should return a result status");
    });
  });
});
