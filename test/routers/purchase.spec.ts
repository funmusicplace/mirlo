import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";

import {
  cancelPreviousAttempt,
  resolveDigitalPurchaseItem,
  resolveMerchPurchaseItem,
} from "../../src/routers/v1/purchase";
import { getClient } from "../../src/utils/getClient";
import { getPaymentProcessor } from "../../src/utils/payments/PaymentProcessor";
import { initiateFundraiserPledge } from "../../src/utils/payments/pledge";
import {
  initiatePayment,
  type ResolvedItem,
} from "../../src/utils/payments/purchase";
import {
  initiateOnlineSubscription,
  initiateSubscription,
  initiateSubscriptionPaymentMethodUpdate,
} from "../../src/utils/payments/subscription";
import * as stripeUtils from "../../src/utils/stripe";
import { finalizeSubscriptionSetup } from "../../src/utils/stripe";
import { getIntentStatus } from "../../src/utils/stripe/status";
import * as terminalUtils from "../../src/utils/stripe/terminal";
import {
  clearTables,
  createClient,
  createProfile,
  createFundraiser,
  createTrack,
  createTrackGroup,
  createMerch,
  createMerchShippingDestination,
  createTier,
  createUser,
} from "../utils";

import { requestApp } from "./utils";

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
      const profile = await createProfile(user.id);
      const tier = await createTier(profile.id);
      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [
            { type: "subscription", tierId: tier.id },
            { type: "tip", amount: 500 },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 400);
    });

    it("should return 200 with clientSecret for a first-time online subscription", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_online",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, { minAmount: 500 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "subscription", tierId: tier.id }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(
        response.body.clientSecret?.startsWith("seti_"),
        "clientSecret should be a SetupIntent secret"
      );
      assert.ok(
        !response.body.requiresShipping,
        "a tier without collectAddress should not ask the frontend for an address"
      );
    });

    it("should return requiresShipping with no allowedCountries restriction for a collectAddress tier's first-time subscription", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_address",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, {
        minAmount: 500,
        collectAddress: true,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "subscription", tierId: tier.id }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(
        response.body.clientSecret?.startsWith("seti_"),
        "clientSecret should be a SetupIntent secret"
      );
      assert.equal(response.body.requiresShipping, true);
      assert.equal(
        response.body.allowedCountries,
        undefined,
        "should not restrict which countries the address picker offers"
      );
    });

    it("should return a hosted redirectUrl (not a raw clientSecret) for a first-time online subscription when hosted is true", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_hosted",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, { minAmount: 500 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "subscription", tierId: tier.id }],
          hosted: true,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.redirectUrl, "should return a redirectUrl");
      assert.ok(response.body.redirectUrl.includes("/checkout"));
      assert.ok(response.body.redirectUrl.includes("checkoutId="));
      assert.ok(
        !response.body.clientSecret,
        "should not leak clientSecret in hosted mode"
      );
    });

    it("should return success:true (not a hosted redirectUrl) when a tier switch is repriced in place, even with hosted: true", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_hosted_switch",
      });
      const { user: buyer, accessToken } = await createUser({
        email: "buyer@test.com",
      });
      const profile = await createProfile(artistUser.id);
      const oldTier = await createTier(profile.id, { minAmount: 500 });
      const newTier = await createTier(profile.id, {
        minAmount: 1000,
        collectAddress: false,
      });

      await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: oldTier.id,
          userId: buyer.id,
          amount: 500,
          stripeSubscriptionKey: "sub_hosted_switch_existing",
        },
      });

      sinon.stub(stripeUtils.stripe.subscriptions, "retrieve").resolves({
        items: { data: [{ id: "si_existing_item" }] },
      } as unknown as Stripe.Response<Stripe.Subscription>);
      sinon
        .stub(stripeUtils.stripe.subscriptions, "update")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_new_tier",
      } as unknown as Stripe.Response<Stripe.Product>);

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "subscription", tierId: newTier.id }],
          hosted: true,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.success, true);
      assert.ok(
        !response.body.redirectUrl,
        "there's no payment step left to send the buyer through, so no redirectUrl is needed"
      );
    });

    it("should return 401 when a readerId is supplied without being logged in", async () => {
      const { user } = await createUser({ email: "artist@test.com" });
      const profile = await createProfile(user.id);
      const tier = await createTier(profile.id, { minAmount: 500 });
      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          readerId: "tmr_test",
          items: [{ type: "subscription", tierId: tier.id }],
        })
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 401);
    });

    it("should return 404 when a readerId is supplied by a user who cannot edit the artist", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, { minAmount: 500 });
      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          readerId: "tmr_test",
          items: [{ type: "subscription", tierId: tier.id }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404);
    });

    it("should return 404 when subscription tier does not exist", async () => {
      const { user, accessToken } = await createUser({
        email: "buyer@test.com",
      });
      const profile = await createProfile(user.id);
      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
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
      const profile = await createProfile(user.id);
      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
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
      const profile = await createProfile(artistUser.id);
      const otherProfile = await createProfile(otherUser.id, {
        urlSlug: "other-artist",
      });
      const tgFromOther = await createTrackGroup(otherProfile.id, {
        minPrice: 1000,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
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
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 0 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
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
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "trackGroup", id: tg.id, price: "1000" }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.clientSecret);
    });

    it("should charge a two-album cart to the one account both albums pay", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_two_albums",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg1 = await createTrackGroup(profile.id, {
        title: "Album One",
        minPrice: 1000,
      });
      const tg2 = await createTrackGroup(profile.id, {
        title: "Album Two",
        minPrice: 500,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [
            { type: "trackGroup", id: tg1.id, price: "1000" },
            { type: "trackGroup", id: tg2.id, price: "500" },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.stripeAccountId, "acct_two_albums");
    });

    it("should return 400 when a release paid to a label is in the same cart as the artist's merch", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_artist_own",
      });
      const { user: label } = await createUser({
        email: "label@test.com",
        stripeAccountId: "acct_label",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });
      await prisma.trackGroup.update({
        where: { id: tg.id },
        data: { paymentToUserId: label.id },
      });
      const merch = await createMerch(profile.id, {
        isPublic: true,
        minPrice: 800,
        quantityRemaining: 10,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [
            { type: "trackGroup", id: tg.id, price: "1000" },
            { type: "merch", id: merch.id, quantity: 1 },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      assert.match(response.body.error, /same account/i);
    });

    it("should return 400 when a release's paymentToUser hasn't connected a payment processor, rather than paying the artist", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_artist_fallback",
      });
      const { user: label } = await createUser({ email: "label@test.com" });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });
      await prisma.trackGroup.update({
        where: { id: tg.id },
        data: { paymentToUserId: label.id },
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "trackGroup", id: tg.id, price: "1000" }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      assert.match(response.body.error, /payment processor/i);
    });

    it("should return 200 for a logged-out purchase with no email", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_tg_guest",
      });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "trackGroup", id: tg.id, price: "1000" }],
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.clientSecret);
      assert.ok(response.body.stripeAccountId);
    });

    it("should return 404 when track does not belong to the given artist", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });
      const { user: otherUser } = await createUser({ email: "other@test.com" });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const otherProfile = await createProfile(otherUser.id, {
        urlSlug: "other-artist-2",
      });
      const tgFromOther = await createTrackGroup(otherProfile.id, {
        minPrice: 1000,
      });
      const trackFromOther = await createTrack(tgFromOther.id, {
        minPrice: 1000,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "track", id: trackFromOther.id }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404);
    });

    it("should return 200 with redirectUrl for a free track when user is logged in", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });
      const { user: buyer, accessToken } = await createUser({
        email: "buyer@test.com",
      });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 0 });
      const track = await createTrack(tg.id, { minPrice: 0 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "track", id: track.id }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.redirectUrl, "should return a redirectUrl");
      assert.ok(response.body.redirectUrl.includes("download"));

      const purchase = await prisma.userTrackPurchase.findFirst({
        where: { userId: buyer.id, trackId: track.id },
      });
      assert.ok(purchase, "purchase record should be created in DB");
    });

    it("should return 200 with clientSecret for a paid online track purchase", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_track_online",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 0 });
      const track = await createTrack(tg.id, { minPrice: 500 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "track", id: track.id, price: "500" }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.clientSecret);
    });

    it("should return 400 when the price offered is below a track's minPrice", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_track_min",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 0 });
      const track = await createTrack(tg.id, { minPrice: 500 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "track", id: track.id, price: "100" }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should return 200 with a hosted redirectUrl when hosted is true", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_tg_hosted",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "trackGroup", id: tg.id, price: "1000" }],
          hosted: true,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.redirectUrl, "should return a redirectUrl");
      assert.ok(response.body.redirectUrl.includes("/checkout"));
      assert.ok(response.body.redirectUrl.includes("checkoutId="));
      assert.ok(
        !response.body.clientSecret,
        "should not leak clientSecret in hosted mode"
      );
    });

    it("should reject a successUrl whose origin is not allowed", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_tg_badurl",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "trackGroup", id: tg.id, price: "1000" }],
          hosted: true,
          successUrl: "https://evil.example.com/thanks",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should accept a successUrl on Mirlo's own origin", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_tg_goodurl",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });
      const client = await getClient();

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "trackGroup", id: tg.id, price: "1000" }],
          hosted: true,
          successUrl: `${client.applicationUrl}/thanks`,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.redirectUrl, "should return a redirectUrl");
    });

    it("should return 200 with clientSecret for an online tip", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_tip_test",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "tip", amount: 500 }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.clientSecret);
      assert.equal(response.body.stripeAccountId, "acct_tip_test");
    });

    it("should return 200 with clientSecret for a catalogue purchase at the floor price", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_catalogue_test",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id, {
        purchaseEntireCatalogMinPrice: 1500,
      });
      await createTrackGroup(profile.id, { minPrice: 1000 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "catalogue" }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.clientSecret);
      assert.equal(response.body.stripeAccountId, "acct_catalogue_test");
    });

    it("should let a buyer pay more than a catalogue's floor price", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_catalogue_more",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id, {
        purchaseEntireCatalogMinPrice: 1500,
      });
      await createTrackGroup(profile.id, { minPrice: 1000 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "catalogue", price: "3000" }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.clientSecret);
    });

    it("should return 400 when a catalogue's floor price is 0", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_catalogue_zero",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "catalogue" }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should subscribe a logged-in buyer to the artist on a catalogue purchase", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_catalogue_follow",
      });
      const { user: buyer, accessToken } = await createUser({
        email: "buyer@test.com",
      });
      const profile = await createProfile(artistUser.id, {
        purchaseEntireCatalogMinPrice: 1500,
      });
      await createTrackGroup(profile.id, { minPrice: 1000 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "catalogue" }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const subscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id },
        include: { profileSubscriptionTier: true },
      });
      assert.ok(subscription, "buyer should be subscribed to the artist");
      assert.equal(subscription?.profileSubscriptionTier.profileId, profile.id);
    });

    it("should return 404 when the artist does not exist for a catalogue purchase", async () => {
      const { accessToken } = await createUser({ email: "buyer@test.com" });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: 999999,
          items: [{ type: "catalogue" }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should reject a catalogue price below the percentage-based floor", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_catalogue_percentage",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id, {
        purchaseEntireCatalogPercentage: 50,
      });
      await createTrackGroup(profile.id, {
        title: "Album One",
        minPrice: 1000,
      });
      await createTrackGroup(profile.id, {
        title: "Album Two",
        minPrice: 2000,
      });

      // Floor is 50% of (1000 + 2000) = 1500
      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "catalogue", price: "1000" }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should reject a paid catalogue purchase when the artist has no payment processor", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id, {
        purchaseEntireCatalogMinPrice: 500,
      });
      await createTrackGroup(profile.id, { minPrice: 1000 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "catalogue", price: "1000" }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      assert.match(response.body.error, /payment processor/i);
    });

    it("should return 200 with clientSecret for an online merch purchase", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_merch_test",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const merch = await createMerch(profile.id, {
        isPublic: true,
        minPrice: 800,
        quantityRemaining: 10,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "merch", id: merch.id, quantity: 1 }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.clientSecret);
    });

    it("should return 200 with clientSecret for a merch purchase with options and a shipping destination", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_merch_options_test",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const merch = await createMerch(profile.id, {
        isPublic: true,
        minPrice: 800,
        quantityRemaining: 10,
      });
      const optionType = await prisma.merchOptionType.create({
        data: { merchId: merch.id, optionName: "size" },
      });
      const option = await prisma.merchOption.create({
        data: {
          merchOptionTypeId: optionType.id,
          name: "large",
          quantityRemaining: 5,
          additionalPrice: 200,
        },
      });
      const destination = await createMerchShippingDestination({
        merchId: merch.id,
        destinationCountry: "US",
        costUnit: 500,
        costExtraUnit: 100,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [
            {
              type: "merch",
              id: merch.id,
              quantity: 2,
              merchOptionIds: [option.id],
              shippingDestinationId: destination.id,
            },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.clientSecret);
    });

    it("should return 400 for a merch option id that doesn't belong to the item", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_merch_bad_option",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const merch = await createMerch(profile.id, {
        isPublic: true,
        minPrice: 800,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [
            {
              type: "merch",
              id: merch.id,
              quantity: 1,
              merchOptionIds: ["not-a-real-option"],
            },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should return 400 when the requested merch quantity exceeds stock", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_merch_oos",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const merch = await createMerch(profile.id, {
        isPublic: true,
        minPrice: 800,
        quantityRemaining: 1,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "merch", id: merch.id, quantity: 2 }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should return 400 when a physically-shipped merch item has no shippingDestinationId", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_merch_no_dest",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const merch = await createMerch(profile.id, {
        isPublic: true,
        minPrice: 800,
      });
      await createMerchShippingDestination({
        merchId: merch.id,
        destinationCountry: "US",
        costUnit: 500,
        costExtraUnit: 100,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "merch", id: merch.id, quantity: 1 }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should return 200 with a SetupIntent clientSecret for a pledge to an active all-or-nothing fundraiser", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_pledge",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const trackGroup = await createTrackGroup(profile.id, { minPrice: 1000 });
      const fundraiser = await createFundraiser(trackGroup.id, {
        isAllOrNothing: true,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [
            {
              type: "fundraiserPledge",
              fundraiserId: fundraiser.id,
              trackGroupId: trackGroup.id,
              price: "2000",
            },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(
        response.body.clientSecret?.startsWith("seti_"),
        "clientSecret should be a SetupIntent secret, not a charge"
      );
      assert.ok(response.body.stripeAccountId);
    });

    it("should return 400 for a pledge to a fundraiser that is no longer ACTIVE", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_pledge_done",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const trackGroup = await createTrackGroup(profile.id, { minPrice: 1000 });
      const fundraiser = await createFundraiser(trackGroup.id, {
        isAllOrNothing: true,
        status: "SUCCESSFUL",
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [
            {
              type: "fundraiserPledge",
              fundraiserId: fundraiser.id,
              trackGroupId: trackGroup.id,
            },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should return 400 when a fundraiser pledge is combined with other items", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_pledge_combo",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const trackGroup = await createTrackGroup(profile.id, { minPrice: 1000 });
      const fundraiser = await createFundraiser(trackGroup.id, {
        isAllOrNothing: true,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [
            {
              type: "fundraiserPledge",
              fundraiserId: fundraiser.id,
              trackGroupId: trackGroup.id,
            },
            { type: "tip", amount: 500 },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });
  });

  // The API under test runs against stripe-mock in another process, so these
  // check response shapes; the "nothing created" and metadata checks live in
  // the direct tests below.
  describe("POST /v1/purchase — deferred intent creation", () => {
    const checkoutIdFrom = (redirectUrl: string) =>
      new URL(redirectUrl).searchParams.get("checkoutId") ?? "";

    it("returns a payment quote instead of a clientSecret for deferred: true", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_deferred_tg",
        currency: "eur",
      });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "trackGroup", id: tg.id, price: "1500" }],
          deferred: true,
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.deferred.mode, "payment");
      assert.equal(response.body.deferred.amount, 1500);
      assert.equal(response.body.deferred.currency, "eur");
      assert.equal(response.body.deferred.stripeAccountId, "acct_deferred_tg");
      assert.equal(response.body.deferred.buyerEmailKnown, false);
      assert.equal(response.body.clientSecret, undefined);
    });

    it("knows the buyer's email for a logged-in quote", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_deferred_known",
        currency: "usd",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "tip", amount: 500 }],
          deferred: true,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.deferred.buyerEmailKnown, true);
    });

    it("returns a setup quote for a deferred subscription", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_deferred_sub",
        currency: "usd",
      });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, {
        minAmount: 500,
        collectAddress: true,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "subscription", tierId: tier.id }],
          deferred: true,
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.deferred.mode, "setup");
      assert.equal(response.body.deferred.amount, undefined);
      assert.equal(response.body.deferred.requiresShipping, true);
      assert.equal(response.body.clientSecret, undefined);
    });

    it("rejects a pledge pay call from a buyer who isn't logged in, even with an email", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_deferred_pledge",
      });
      const profile = await createProfile(artistUser.id);
      const trackGroup = await createTrackGroup(profile.id, { minPrice: 1000 });
      const fundraiser = await createFundraiser(trackGroup.id, {
        isAllOrNothing: true,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [
            {
              type: "fundraiserPledge",
              fundraiserId: fundraiser.id,
              trackGroupId: trackGroup.id,
              price: "1000",
            },
          ],
          email: "someone-else@test.com",
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("rejects an invalid email", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_deferred_bad_email",
      });
      const profile = await createProfile(artistUser.id);

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "tip", amount: 500 }],
          email: "not-an-email",
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("saves the opened cart as a checkout", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_checkout_open",
        currency: "usd",
      });
      const profile = await createProfile(artistUser.id);
      const items = [{ type: "tip", amount: 700 }];

      const response = await requestApp
        .post("purchase")
        .send({ artistId: profile.id, items, deferred: true })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const checkout = await prisma.checkout.findUnique({
        where: { id: response.body.deferred.checkoutId },
      });
      assert.equal(checkout?.profileId, profile.id);
      assert.deepEqual(checkout?.items, items);
      assert.equal(checkout?.stripeId, null);
      assert.equal(checkout?.completedAt, null);
      assert.equal(await prisma.userTransaction.count(), 0);
    });

    it("round-trips a hosted request through its checkout", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_hosted_checkout",
        currency: "usd",
      });
      const profile = await createProfile(artistUser.id, {
        name: "Checkout Band",
      });
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });
      const apiClient = await createClient("hosted-checkout-key");

      const opened = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [{ type: "trackGroup", id: tg.id, price: "1000" }],
          hosted: true,
          successUrl: "http://localhost/thanks",
        })
        .set("mirlo-api-key", apiClient.key ?? "")
        .set("Accept", "application/json");
      assert.equal(opened.statusCode, 200);
      assert.equal(opened.body.clientSecret, undefined);
      const checkoutId = checkoutIdFrom(opened.body.redirectUrl);
      const checkout = await prisma.checkout.findUnique({
        where: { id: checkoutId },
      });
      assert.equal(checkout?.clientId, apiClient.id);

      // The browser tries to change the cart; the checkout's wins.
      const quote = await requestApp
        .post("purchase")
        .send({
          checkoutId,
          deferred: true,
          items: [{ type: "trackGroup", id: tg.id, price: "1" }],
        })
        .set("Accept", "application/json");
      assert.equal(quote.statusCode, 200);
      assert.equal(quote.body.deferred.checkoutId, checkoutId);
      assert.equal(quote.body.deferred.amount, 1000);
      assert.equal(quote.body.deferred.buyerEmailKnown, false);
      assert.equal(quote.body.deferred.artistName, "Checkout Band");
      assert.equal(quote.body.deferred.successUrl, "http://localhost/thanks");

      const paid = await requestApp
        .post("purchase")
        .send({
          checkoutId,
          email: "guest@test.com",
          successUrl: "https://evil.example.com",
        })
        .set("Accept", "application/json");
      assert.equal(paid.statusCode, 200);
      assert.ok(paid.body.clientSecret, "paying creates the intent");

      const afterPay = await prisma.checkout.findUnique({
        where: { id: checkoutId },
      });
      assert.ok(afterPay?.stripeId, "the intent is recorded on the checkout");
      assert.equal(afterPay?.stripeAccountId, "acct_hosted_checkout");

      // Paying again (a declined card, a corrected email) replaces that
      // intent with one built from the new request.
      const retried = await requestApp
        .post("purchase")
        .send({ checkoutId, email: "corrected@test.com" })
        .set("Accept", "application/json");
      assert.equal(retried.statusCode, 200);
      assert.ok(retried.body.clientSecret);
      const afterRetry = await prisma.checkout.findUnique({
        where: { id: checkoutId },
      });
      assert.ok(afterRetry?.stripeId);
      assert.notEqual(afterRetry?.stripeId, afterPay?.stripeId);
    });

    it("doesn't follow the artist or claim anything for a logged-in buyer who opens a checkout link", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_checkout_look",
        currency: "usd",
      });
      const { user: buyer, accessToken } = await createUser({
        email: "buyer@test.com",
      });
      const profile = await createProfile(artistUser.id);
      const free = await createTrackGroup(profile.id, { minPrice: 0 });
      const checkout = await prisma.checkout.create({
        data: {
          profileId: profile.id,
          items: [
            { type: "trackGroup", id: free.id, price: "0" },
            { type: "tip", amount: 500 },
          ],
        },
      });

      const response = await requestApp
        .post("purchase")
        .send({ checkoutId: checkout.id, deferred: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.deferred.amount, 500);
      assert.equal(
        await prisma.profileUserSubscription.count({
          where: { userId: buyer.id },
        }),
        0
      );
      assert.equal(
        await prisma.userTrackGroupPurchase.count({
          where: { userId: buyer.id },
        }),
        0
      );
    });

    it("charges a free release in a bigger cart at zero rather than skipping the rest of the cart", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_free_in_cart",
        currency: "usd",
      });
      const { user: buyer, accessToken } = await createUser({
        email: "buyer@test.com",
      });
      const profile = await createProfile(artistUser.id);
      const free = await createTrackGroup(profile.id, { minPrice: 0 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: profile.id,
          items: [
            { type: "trackGroup", id: free.id, price: "0" },
            { type: "tip", amount: 500 },
          ],
          deferred: true,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.redirectUrl, undefined);
      assert.equal(response.body.deferred.amount, 500);
      assert.equal(
        await prisma.userTrackGroupPurchase.count({
          where: { userId: buyer.id },
        }),
        0
      );
    });

    it("404s for an unknown checkout", async () => {
      const response = await requestApp
        .post("purchase")
        .send({ checkoutId: "not-a-checkout", deferred: true })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("reports a paid checkout as done when its link is opened again", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_checkout_done",
      });
      const profile = await createProfile(artistUser.id);
      const checkout = await prisma.checkout.create({
        data: {
          profileId: profile.id,
          items: [],
          completedAt: new Date(),
          successUrl: "https://wp-site.com/thanks",
        },
      });

      const response = await requestApp
        .post("purchase")
        .send({ checkoutId: checkout.id, deferred: true })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.successUrl, "https://wp-site.com/thanks");
    });

    it("refuses to pay a different amount than the checkout was quoted at", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_checkout_amount",
      });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });
      const checkout = await prisma.checkout.create({
        data: {
          profileId: profile.id,
          items: [{ type: "trackGroup", id: tg.id, price: "1500" }],
        },
      });

      const response = await requestApp
        .post("purchase")
        .send({
          checkoutId: checkout.id,
          email: "buyer@test.com",
          amount: 1200,
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 409);
    });
  });

  describe("deferred initiation (direct) — nothing created until pay", () => {
    it("quotes a subscription without creating a SetupIntent", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_direct_deferred_sub",
        currency: "usd",
      });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, { minAmount: 500 });
      const create = sinon.stub(stripeUtils.stripe.setupIntents, "create");

      const result = await initiateOnlineSubscription({
        profileId: profile.id,
        tierId: tier.id,
        userEmail: "",
        deferred: true,
      });

      assert.deepEqual(result, {
        deferred: {
          mode: "setup",
          currency: "usd",
          stripeAccountId: "acct_direct_deferred_sub",
          requiresShipping: false,
        },
      });
      assert.equal(create.callCount, 0);
    });

    it("puts a subscription's shippingAddress on the SetupIntent at pay time", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_direct_sub_ship",
        currency: "usd",
      });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, {
        minAmount: 500,
        collectAddress: true,
      });
      const create = sinon
        .stub(stripeUtils.stripe.setupIntents, "create")
        .resolves({
          id: "seti_direct_ship",
          client_secret: "seti_direct_ship_secret",
        } as unknown as Stripe.Response<Stripe.SetupIntent>);
      const shippingAddress = {
        name: "Buyer",
        address: { line1: "1 Main St", country: "US" },
      };

      await initiateOnlineSubscription({
        profileId: profile.id,
        tierId: tier.id,
        userEmail: "guest@test.com",
        shippingAddress,
      });

      const params = create.firstCall.args[0] as Stripe.SetupIntentCreateParams;
      assert.deepEqual(
        JSON.parse(params.metadata?.shippingAddress as string),
        shippingAddress
      );
      assert.equal(params.metadata?.userEmail, "guest@test.com");
    });

    it("quotes a pledge without touching Stripe customers or intents", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_direct_deferred_pledge",
        currency: "usd",
      });
      const profile = await createProfile(artistUser.id);
      const trackGroup = await createTrackGroup(profile.id, { minPrice: 1000 });
      const fundraiser = await createFundraiser(trackGroup.id, {
        isAllOrNothing: true,
      });
      const list = sinon.stub(stripeUtils.stripe.customers, "list");
      const create = sinon.stub(stripeUtils.stripe.setupIntents, "create");

      const result = await initiateFundraiserPledge({
        profileId: profile.id,
        fundraiserId: fundraiser.id,
        trackGroupId: trackGroup.id,
        price: "1000",
        userEmail: "",
        deferred: true,
      });

      assert.equal("deferred" in result && result.deferred.mode, "setup");
      assert.equal(list.callCount, 0);
      assert.equal(create.callCount, 0);
    });

    it("refuses to create a pledge without a logged-in buyer and their email", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_direct_pledge_no_email",
        currency: "usd",
      });
      const profile = await createProfile(artistUser.id);
      const trackGroup = await createTrackGroup(profile.id, { minPrice: 1000 });
      const fundraiser = await createFundraiser(trackGroup.id, {
        isAllOrNothing: true,
      });
      const list = sinon.stub(stripeUtils.stripe.customers, "list");
      const pledge = { profileId: profile.id, fundraiserId: fundraiser.id };

      await assert.rejects(
        initiateFundraiserPledge({
          ...pledge,
          trackGroupId: trackGroup.id,
          price: "1000",
          userEmail: "someone-else@test.com",
        })
      );
      await assert.rejects(
        initiateFundraiserPledge({
          ...pledge,
          trackGroupId: trackGroup.id,
          price: "1000",
          userEmail: "",
          userId: artistUser.id,
        })
      );
      assert.equal(
        list.callCount,
        0,
        "an empty email filter must never reach customers.list"
      );
    });
  });

  describe("cancelPreviousAttempt (direct)", () => {
    const stubIntent = (
      resource: "paymentIntents" | "setupIntents",
      status: string
    ) => {
      sinon
        .stub(stripeUtils.stripe[resource], "retrieve")
        .resolves({ id: "intent", status, metadata: {} } as any);
      return sinon
        .stub(stripeUtils.stripe[resource], "cancel")
        .resolves({ id: "intent", status: "canceled" } as any);
    };

    it("cancels an attempt that wasn't paid, so the retry builds a new intent", async () => {
      const cancel = stubIntent("paymentIntents", "requires_payment_method");

      const result = await cancelPreviousAttempt({
        stripeId: "pi_declined",
        stripeAccountId: "acct_retry",
      });

      assert.equal(result.alreadyPaid, false);
      assert.equal(cancel.callCount, 1);
      assert.deepEqual(cancel.firstCall.args, [
        "pi_declined",
        {},
        { stripeAccount: "acct_retry" },
      ]);
    });

    it("reports a succeeded or processing payment as paid, without cancelling it", async () => {
      for (const status of ["succeeded", "processing"]) {
        sinon.restore();
        const cancel = stubIntent("paymentIntents", status);

        const result = await cancelPreviousAttempt({
          stripeId: "pi_paid",
          stripeAccountId: "acct_retry",
        });

        assert.equal(result.alreadyPaid, true, status);
        assert.equal(cancel.callCount, 0, status);
      }
    });

    it("reports a subscription's succeeded SetupIntent as paid, so a retry can't start a second subscription", async () => {
      const cancel = stubIntent("setupIntents", "succeeded");

      const result = await cancelPreviousAttempt({
        stripeId: "seti_confirmed",
        stripeAccountId: "acct_retry",
      });

      assert.equal(result.alreadyPaid, true);
      assert.equal(cancel.callCount, 0);
    });

    it("leaves an attempt that's already cancelled alone", async () => {
      const cancel = stubIntent("paymentIntents", "canceled");

      const result = await cancelPreviousAttempt({
        stripeId: "pi_cancelled",
        stripeAccountId: "acct_retry",
      });

      assert.equal(result.alreadyPaid, false);
      assert.equal(cancel.callCount, 0);
    });

    it("does nothing for a checkout that hasn't been paid for yet", async () => {
      const retrieve = sinon.stub(
        stripeUtils.stripe.paymentIntents,
        "retrieve"
      );

      const result = await cancelPreviousAttempt({
        stripeId: null,
        stripeAccountId: null,
      });

      assert.equal(result.alreadyPaid, false);
      assert.equal(retrieve.callCount, 0);
    });
  });

  describe("initiateFundraiserPledge (direct)", () => {
    it("attaches a Stripe Customer to the pledge SetupIntent so it can be charged later", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_pledge_customer",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const trackGroup = await createTrackGroup(profile.id, { minPrice: 1000 });
      const fundraiser = await createFundraiser(trackGroup.id, {
        isAllOrNothing: true,
      });

      sinon.stub(stripeUtils.stripe.customers, "list").resolves({
        data: [],
      } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Customer>>);
      const createCustomerStub = sinon
        .stub(stripeUtils.stripe.customers, "create")
        .resolves({
          id: "cus_pledge_test",
        } as unknown as Stripe.Response<Stripe.Customer>);
      const createSetupIntentStub = sinon
        .stub(stripeUtils.stripe.setupIntents, "create")
        .resolves({
          id: "seti_pledge_test",
          client_secret: "seti_pledge_test_secret",
        } as unknown as Stripe.Response<Stripe.SetupIntent>);

      await initiateFundraiserPledge({
        profileId: profile.id,
        fundraiserId: fundraiser.id,
        trackGroupId: trackGroup.id,
        price: "2000",
        userEmail: buyer.email,
        userId: buyer.id,
      });

      assert.ok(
        createCustomerStub.calledOnce,
        "should find or create a Stripe Customer for the buyer"
      );

      const setupIntentParams = createSetupIntentStub.firstCall
        .args[0] as Stripe.SetupIntentCreateParams;
      assert.equal(
        setupIntentParams.customer,
        "cus_pledge_test",
        "the pledge SetupIntent must be attached to a Customer, or chargePledgePayments has no payment method to find later"
      );
    });
  });

  describe("initiatePayment (direct)", () => {
    const stubStripeForOnline = (currency = "usd") => {
      sinon.stub(stripeUtils.stripe.accounts, "retrieve").resolves({
        id: "acct_online",
        default_currency: currency,
        country: "US",
      } as unknown as Stripe.Response<Stripe.Account>);
      return sinon.stub(stripeUtils.stripe.paymentIntents, "create").resolves({
        id: "pi_online_test",
        client_secret: "pi_secret_test",
      } as unknown as Stripe.Response<Stripe.PaymentIntent>);
    };

    const metadataOf = (createStub: sinon.SinonStub): Record<string, string> =>
      (createStub.firstCall.args[0] as Stripe.PaymentIntentCreateParams)
        .metadata as Record<string, string>;

    it("should return paymentIntentId for a terminal trackGroup purchase", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_tg_terminal",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });

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
        profileId: profile.id,
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

    it("tags a single online trackGroup purchase with purchaseType 'trackGroup' and its trackGroupId", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_meta_tg",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });

      const createStub = stubStripeForOnline();

      const result = await initiatePayment({
        profileId: profile.id,
        items: [
          { type: "trackGroup", id: String(tg.id), quantity: 1, amount: 1000 },
        ],
        userEmail: buyer.email,
        userId: String(buyer.id),
      });

      assert.ok(
        "clientSecret" in result,
        "an online purchase returns a secret"
      );
      const metadata = metadataOf(createStub);
      assert.equal(metadata.purchaseType, "trackGroup");
      assert.equal(metadata.trackGroupId, String(tg.id));
    });

    it("keeps purchaseType 'trackGroup' for several trackGroup items (uniq collapses the type)", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_meta_multi_tg",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg1 = await createTrackGroup(profile.id, {
        title: "First album",
        minPrice: 1000,
      });
      const tg2 = await createTrackGroup(profile.id, {
        title: "Second album",
        minPrice: 500,
      });

      const createStub = stubStripeForOnline();

      await initiatePayment({
        profileId: profile.id,
        items: [
          { type: "trackGroup", id: String(tg1.id), quantity: 1, amount: 1000 },
          { type: "trackGroup", id: String(tg2.id), quantity: 1, amount: 500 },
        ],
        userEmail: buyer.email,
        userId: String(buyer.id),
      });

      const metadata = metadataOf(createStub);
      assert.equal(metadata.purchaseType, "trackGroup");
      assert.equal(metadata.trackGroupId, String(tg1.id));
    });

    it("tags a single online track purchase with purchaseType 'track' and its trackId", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_meta_track",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 0 });
      const track = await createTrack(tg.id, { minPrice: 500 });

      const createStub = stubStripeForOnline();

      const result = await initiatePayment({
        profileId: profile.id,
        items: [
          { type: "track", id: String(track.id), quantity: 1, amount: 500 },
        ],
        userEmail: buyer.email,
        userId: String(buyer.id),
      });

      assert.ok(
        "clientSecret" in result,
        "an online purchase returns a secret"
      );
      const metadata = metadataOf(createStub);
      assert.equal(metadata.purchaseType, "track");
      assert.equal(metadata.trackId, String(track.id));
      assert.ok(
        !("trackGroupId" in metadata),
        "a single-track purchase carries no trackGroupId"
      );
    });

    it("tags a single online tip as purchaseType 'tip' and omits trackGroupId", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_meta_tip",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);

      const createStub = stubStripeForOnline();

      await initiatePayment({
        profileId: profile.id,
        items: [{ type: "tip", quantity: 1, amount: 500 }],
        userEmail: buyer.email,
        userId: String(buyer.id),
      });

      const metadata = metadataOf(createStub);
      assert.equal(metadata.purchaseType, "tip");
      assert.ok(!("trackGroupId" in metadata), "a tip carries no trackGroupId");
    });

    it("falls back to purchaseType 'merch' for mixed item types and omits trackGroupId", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_meta_mixed",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });

      const createStub = stubStripeForOnline();

      await initiatePayment({
        profileId: profile.id,
        items: [
          { type: "trackGroup", id: String(tg.id), quantity: 1, amount: 1000 },
          { type: "tip", quantity: 1, amount: 500 },
        ],
        userEmail: buyer.email,
        userId: String(buyer.id),
      });

      const metadata = metadataOf(createStub);
      assert.equal(metadata.purchaseType, "merch");
      assert.ok(
        !("trackGroupId" in metadata),
        "a mixed cart carries no trackGroupId"
      );
    });

    it("charges the summed amount on the artist's connected account and echoes the cart in metadata", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_meta_sum",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });

      const createStub = stubStripeForOnline("eur");

      const items = [
        {
          type: "trackGroup" as const,
          id: String(tg.id),
          quantity: 1,
          amount: 1200,
          message: "thanks!",
        },
      ];

      const result = await initiatePayment({
        profileId: profile.id,
        items,
        userEmail: buyer.email,
        userId: String(buyer.id),
      });

      const params = createStub.firstCall
        .args[0] as Stripe.PaymentIntentCreateParams;
      const options = createStub.firstCall.args[1] as Stripe.RequestOptions;
      assert.equal(params.amount, 1200);
      assert.equal(params.currency, "eur");
      assert.equal(options.stripeAccount, "acct_meta_sum");

      const metadata = metadataOf(createStub);
      assert.equal(metadata.items, JSON.stringify(items));
      assert.equal(metadata.userEmail, buyer.email);
      assert.equal(metadata.userId, String(buyer.id));
      assert.equal(metadata.artistId, String(profile.id));

      assert.ok("clientSecret" in result);
      assert.equal(
        (result as { stripeAccountId: string }).stripeAccountId,
        "acct_meta_sum"
      );
      assert.equal(
        (result as { paymentIntentId: string }).paymentIntentId,
        "pi_online_test"
      );
    });

    describe("platform fee inheritance (album -> artist -> platform)", () => {
      it("charges the full amount as the application fee for a trackGroup set to 100% platform", async () => {
        const { user: artistUser } = await createUser({
          email: "artist@test.com",
          stripeAccountId: "acct_fee_100",
        });
        const { user: buyer } = await createUser({ email: "buyer@test.com" });
        const profile = await createProfile(artistUser.id, {
          defaultPlatformFee: 10,
        });
        const tg = await createTrackGroup(profile.id, {
          minPrice: 1000,
          platformPercent: 100,
        });

        const createStub = stubStripeForOnline();

        await initiatePayment({
          profileId: profile.id,
          items: [
            {
              type: "trackGroup",
              id: String(tg.id),
              quantity: 1,
              amount: 1000,
              platformPercent: tg.platformPercent,
            },
          ],
          userEmail: buyer.email,
          userId: String(buyer.id),
        });

        const params = createStub.firstCall
          .args[0] as Stripe.PaymentIntentCreateParams;
        assert.equal(
          params.application_fee_amount,
          1000,
          "a trackGroup with platformPercent 100 should send the entire charge to the platform"
        );
      });

      it("falls back to the artist's defaultPlatformFee when the trackGroup has no platformPercent override", async () => {
        const { user: artistUser } = await createUser({
          email: "artist@test.com",
          stripeAccountId: "acct_fee_artist_fallback",
        });
        const { user: buyer } = await createUser({ email: "buyer@test.com" });
        const profile = await createProfile(artistUser.id, {
          defaultPlatformFee: 20,
        });
        const tg = await createTrackGroup(profile.id, {
          minPrice: 1000,
          platformPercent: null,
        });

        const createStub = stubStripeForOnline();

        await initiatePayment({
          profileId: profile.id,
          items: [
            {
              type: "trackGroup",
              id: String(tg.id),
              quantity: 1,
              amount: 1000,
              platformPercent: tg.platformPercent,
            },
          ],
          userEmail: buyer.email,
          userId: String(buyer.id),
        });

        const params = createStub.firstCall
          .args[0] as Stripe.PaymentIntentCreateParams;
        assert.equal(
          params.application_fee_amount,
          200,
          "should inherit the artist's 20% defaultPlatformFee when the album has no override"
        );
      });

      it("prefers the trackGroup's own platformPercent over the artist's defaultPlatformFee", async () => {
        const { user: artistUser } = await createUser({
          email: "artist@test.com",
          stripeAccountId: "acct_fee_album_override",
        });
        const { user: buyer } = await createUser({ email: "buyer@test.com" });
        const profile = await createProfile(artistUser.id, {
          defaultPlatformFee: 50,
        });
        const tg = await createTrackGroup(profile.id, {
          minPrice: 1000,
          platformPercent: 15,
        });

        const createStub = stubStripeForOnline();

        await initiatePayment({
          profileId: profile.id,
          items: [
            {
              type: "trackGroup",
              id: String(tg.id),
              quantity: 1,
              amount: 1000,
              platformPercent: tg.platformPercent,
            },
          ],
          userEmail: buyer.email,
          userId: String(buyer.id),
        });

        const params = createStub.firstCall
          .args[0] as Stripe.PaymentIntentCreateParams;
        assert.equal(
          params.application_fee_amount,
          150,
          "the album's own 15% override should win over the artist's 50% default"
        );
      });

      it("falls back to the site default platformPercent when neither the trackGroup nor the artist set one", async () => {
        const { user: artistUser } = await createUser({
          email: "artist@test.com",
          stripeAccountId: "acct_fee_site_default",
        });
        const { user: buyer } = await createUser({ email: "buyer@test.com" });
        const profile = await createProfile(artistUser.id, {
          defaultPlatformFee: null,
        });
        const tg = await createTrackGroup(profile.id, {
          minPrice: 1000,
          platformPercent: null,
        });

        const createStub = stubStripeForOnline();

        await initiatePayment({
          profileId: profile.id,
          items: [
            {
              type: "trackGroup",
              id: String(tg.id),
              quantity: 1,
              amount: 1000,
              platformPercent: tg.platformPercent,
            },
          ],
          userEmail: buyer.email,
          userId: String(buyer.id),
        });

        const params = createStub.firstCall
          .args[0] as Stripe.PaymentIntentCreateParams;
        assert.equal(
          params.application_fee_amount,
          100,
          "should fall back to the site-wide 10% default (seeded in getSiteSettings)"
        );
      });

      it("resolveDigitalPurchaseItem (router) carries the trackGroup's platformPercent onto the ResolvedItem", async () => {
        const { user: artistUser } = await createUser({
          email: "artist@test.com",
        });
        const profile = await createProfile(artistUser.id, {
          defaultPlatformFee: 10,
        });
        const tg = await createTrackGroup(profile.id, {
          minPrice: 1000,
          platformPercent: 100,
        });
        const fullProfile = await prisma.profile.findFirstOrThrow({
          where: { id: profile.id },
          include: { user: true, paymentToUser: true, subscriptionTiers: true },
        });

        const result = await resolveDigitalPurchaseItem({
          type: "trackGroup",
          id: tg.id,
          price: "1000",
          minPrice: tg.minPrice,
          platformPercent: tg.platformPercent,
          profile: fullProfile,
          paymentToUser: null,
          releaseUrlSlug: tg.urlSlug,
          releaseId: tg.id,
          handleFreePurchase: async () => {},
        });

        assert.equal(result.kind, "paid");
        assert.equal(
          (result as { item: ResolvedItem }).item.platformPercent,
          100,
          "the album's 100% platformPercent override must reach the ResolvedItem"
        );
      });

      it("resolveMerchPurchaseItem carries the merch item's own platformPercent onto the ResolvedItem", async () => {
        const { user: artistUser } = await createUser({
          email: "artist@test.com",
        });
        const profile = await createProfile(artistUser.id, {
          defaultPlatformFee: 10,
        });
        const merch = await createMerch(profile.id, {
          isPublic: true,
          minPrice: 800,
          quantityRemaining: 10,
          platformPercent: 100,
        });
        const fullMerch = await prisma.merch.findFirstOrThrow({
          where: { id: merch.id },
          include: {
            optionTypes: { include: { options: true } },
            shippingDestinations: true,
          },
        });

        const { item } = resolveMerchPurchaseItem(fullMerch, {
          type: "merch",
          id: merch.id,
          quantity: 1,
        });

        assert.equal(
          item.platformPercent,
          100,
          "merch's own platformPercent override must reach the ResolvedItem"
        );
      });
    });
  });

  describe("initiateSubscription (direct)", () => {
    it("should return setupIntentId for a terminal subscription", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_terminal",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, {
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
        profileId: profile.id,
        tierId: tier.id,
        amount: 1000,
        userEmail: buyer.email,
        userId: String(buyer.id),
      });

      assert.equal(result.setupIntentId, "seti_sub_terminal");
    });
  });

  describe("initiateOnlineSubscription (direct) — tier switching", () => {
    it("reprices the existing subscription in place instead of cancelling it, when no address collection is needed", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_switch",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const oldTier = await createTier(profile.id, { minAmount: 500 });
      const newTier = await createTier(profile.id, {
        minAmount: 1000,
        collectAddress: false,
        platformPercent: 12,
      });

      const existing = await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: oldTier.id,
          userId: buyer.id,
          amount: 500,
          platformCut: 35,
          stripeSubscriptionKey: "sub_existing_123",
        },
      });

      sinon.stub(stripeUtils.stripe.subscriptions, "retrieve").resolves({
        items: { data: [{ id: "si_existing_item" }] },
      } as unknown as Stripe.Response<Stripe.Subscription>);
      const updateStub = sinon
        .stub(stripeUtils.stripe.subscriptions, "update")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_new_tier",
      } as unknown as Stripe.Response<Stripe.Product>);

      const result = await initiateOnlineSubscription({
        profileId: profile.id,
        tierId: newTier.id,
        userEmail: buyer.email,
        userId: buyer.id,
      });

      assert.deepEqual(result, { success: true });
      assert.equal(updateStub.calledOnce, true);
      assert.equal(updateStub.getCall(0).args[1]?.proration_behavior, "none");
      assert.equal(
        updateStub.getCall(0).args[1]?.application_fee_percent,
        12,
        "the new tier's platform fee percentage should be applied to the repriced subscription"
      );

      const after = await prisma.profileUserSubscription.findFirst({
        where: { id: existing.id },
      });
      assert.ok(after, "the same subscription row should still exist");
      assert.equal(after?.profileSubscriptionTierId, newTier.id);
      assert.equal(after?.amount, 1000);
      assert.equal(
        after?.platformCut,
        120,
        "platformCut should be recalculated from the new tier's fee percentage, not left at the old tier's"
      );
      assert.equal(
        after?.stripeSubscriptionKey,
        "sub_existing_123",
        "the underlying Stripe subscription is repriced, not replaced"
      );
    });

    it("leaves the subscription alone when a checkout link is opened (switchImmediately: false)", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_switch_link",
        currency: "usd",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const oldTier = await createTier(profile.id, { minAmount: 500 });
      const newTier = await createTier(profile.id, { minAmount: 1000 });
      await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: oldTier.id,
          userId: buyer.id,
          amount: 500,
          stripeSubscriptionKey: "sub_existing_link",
        },
      });
      const updateStub = sinon.stub(stripeUtils.stripe.subscriptions, "update");

      const result = await initiateOnlineSubscription({
        profileId: profile.id,
        tierId: newTier.id,
        userEmail: buyer.email,
        userId: buyer.id,
        deferred: true,
        switchImmediately: false,
      });

      assert.equal("deferred" in result && result.deferred.mode, "setup");
      assert.equal(updateStub.callCount, 0);
      const after = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id },
      });
      assert.equal(after?.profileSubscriptionTierId, oldTier.id);
    });

    it("falls back to the artist's defaultPlatformFee when repricing to a tier with no platformPercent override", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_switch_fee_fallback",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id, {
        defaultPlatformFee: 25,
      });
      const oldTier = await createTier(profile.id, { minAmount: 500 });
      const newTier = await createTier(profile.id, {
        minAmount: 1000,
        collectAddress: false,
        platformPercent: null,
      });

      const existing = await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: oldTier.id,
          userId: buyer.id,
          amount: 500,
          platformCut: 35,
          stripeSubscriptionKey: "sub_existing_fee_fallback",
        },
      });

      sinon.stub(stripeUtils.stripe.subscriptions, "retrieve").resolves({
        items: { data: [{ id: "si_existing_item" }] },
      } as unknown as Stripe.Response<Stripe.Subscription>);
      const updateStub = sinon
        .stub(stripeUtils.stripe.subscriptions, "update")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_new_tier_fallback",
      } as unknown as Stripe.Response<Stripe.Product>);

      await initiateOnlineSubscription({
        profileId: profile.id,
        tierId: newTier.id,
        userEmail: buyer.email,
        userId: buyer.id,
      });

      assert.equal(
        updateStub.getCall(0).args[1]?.application_fee_percent,
        25,
        "should inherit the artist's 25% defaultPlatformFee when the tier has no override"
      );

      const after = await prisma.profileUserSubscription.findFirst({
        where: { id: existing.id },
      });
      assert.equal(after?.platformCut, 250);
    });

    it("clears deleteReason when a cancelled-but-not-yet-expired subscription is repriced in place onto a new tier", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_resubscribe",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const oldTier = await createTier(profile.id, { minAmount: 500 });
      const newTier = await createTier(profile.id, { minAmount: 1000 });

      const existing = await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: oldTier.id,
          userId: buyer.id,
          amount: 500,
          stripeSubscriptionKey: "sub_cancelled_123",
          deleteReason: "USER_CANCELLED",
        },
      });

      sinon.stub(stripeUtils.stripe.subscriptions, "retrieve").resolves({
        items: { data: [{ id: "si_existing_item" }] },
      } as unknown as Stripe.Response<Stripe.Subscription>);
      sinon
        .stub(stripeUtils.stripe.subscriptions, "update")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_tier",
      } as unknown as Stripe.Response<Stripe.Product>);

      const result = await initiateOnlineSubscription({
        profileId: profile.id,
        tierId: newTier.id,
        userEmail: buyer.email,
        userId: buyer.id,
      });

      assert.deepEqual(result, { success: true });

      const after = await prisma.profileUserSubscription.findFirst({
        where: { id: existing.id },
      });
      assert.equal(after?.profileSubscriptionTierId, newTier.id);
      assert.equal(
        after?.deleteReason,
        null,
        "resubscribing in place should clear the prior cancellation, not leave it showing as cancelled"
      );
    });

    it("does not cancel the old subscription up front when a fresh SetupIntent is needed", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_switch_2",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const oldTier = await createTier(profile.id, { minAmount: 500 });
      const newTier = await createTier(profile.id, {
        minAmount: 1000,
        collectAddress: true,
      });

      await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: oldTier.id,
          userId: buyer.id,
          amount: 500,
          stripeSubscriptionKey: "sub_existing_456",
        },
      });

      sinon.stub(stripeUtils.stripe.setupIntents, "create").resolves({
        id: "seti_switch",
        client_secret: "seti_switch_secret",
      } as unknown as Stripe.Response<Stripe.SetupIntent>);

      const result = await initiateOnlineSubscription({
        profileId: profile.id,
        tierId: newTier.id,
        userEmail: buyer.email,
        userId: buyer.id,
      });

      assert.equal("clientSecret" in result, true);

      const oldSubscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, profileSubscriptionTierId: oldTier.id },
      });
      assert.ok(
        oldSubscription,
        "the old subscription must still exist — it is not cancelled before the new one is confirmed"
      );
      assert.equal(oldSubscription?.deleteReason, null);
    });

    it("reprices in place when switching between two collectAddress tiers and an address is already on file", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_switch_3",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const oldTier = await createTier(profile.id, {
        minAmount: 500,
        collectAddress: true,
      });
      const newTier = await createTier(profile.id, {
        minAmount: 1000,
        collectAddress: true,
        platformPercent: 12,
      });

      const shippingAddress = {
        name: "Buyer Name",
        address: { line1: "123 Main St", country: "US" },
      };
      await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: oldTier.id,
          userId: buyer.id,
          amount: 500,
          platformCut: 35,
          stripeSubscriptionKey: "sub_existing_addr",
          shippingAddress,
        },
      });

      sinon.stub(stripeUtils.stripe.subscriptions, "retrieve").resolves({
        items: { data: [{ id: "si_existing_item" }] },
      } as unknown as Stripe.Response<Stripe.Subscription>);
      const updateStub = sinon
        .stub(stripeUtils.stripe.subscriptions, "update")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);
      const setupIntentStub = sinon.stub(
        stripeUtils.stripe.setupIntents,
        "create"
      );
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_new_tier_addr",
      } as unknown as Stripe.Response<Stripe.Product>);

      const result = await initiateOnlineSubscription({
        profileId: profile.id,
        tierId: newTier.id,
        userEmail: buyer.email,
        userId: buyer.id,
      });

      assert.deepEqual(result, { success: true });
      assert.equal(
        updateStub.calledOnce,
        true,
        "should reprice in place instead of creating a fresh SetupIntent"
      );
      assert.equal(
        setupIntentStub.called,
        false,
        "no new SetupIntent should be created when we already have the address on file"
      );

      const after = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, profileSubscriptionTierId: newTier.id },
      });
      assert.deepEqual(
        after?.shippingAddress,
        shippingAddress,
        "the existing address is carried over untouched"
      );
    });

    it("carries the old subscription key in the fresh SetupIntent's metadata so it can be cancelled once confirmed", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_switch_4",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const oldTier = await createTier(profile.id, { minAmount: 500 });
      const newTier = await createTier(profile.id, {
        minAmount: 1000,
        collectAddress: true,
      });

      await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: oldTier.id,
          userId: buyer.id,
          amount: 500,
          stripeSubscriptionKey: "sub_existing_789",
        },
      });

      const setupIntentStub = sinon
        .stub(stripeUtils.stripe.setupIntents, "create")
        .resolves({
          id: "seti_switch_2",
          client_secret: "seti_switch_2_secret",
        } as unknown as Stripe.Response<Stripe.SetupIntent>);

      await initiateOnlineSubscription({
        profileId: profile.id,
        tierId: newTier.id,
        userEmail: buyer.email,
        userId: buyer.id,
      });

      assert.equal(setupIntentStub.calledOnce, true);
      const metadata = (setupIntentStub.getCall(0).args[0] as any)?.metadata;
      assert.equal(metadata?.oldStripeSubscriptionKey, "sub_existing_789");
    });
  });

  describe("finalizeSubscriptionSetup (direct)", () => {
    it("creates the subscription and only cancels the old tier once the new one is confirmed", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_finalize",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const oldTier = await createTier(profile.id, { minAmount: 500 });
      const newTier = await createTier(profile.id, { minAmount: 1000 });

      await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: oldTier.id,
          userId: buyer.id,
          amount: 500,
          stripeSubscriptionKey: "sub_old_789",
        },
      });

      sinon.stub(stripeUtils.stripe.customers, "list").resolves({
        data: [],
      } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Customer>>);
      sinon.stub(stripeUtils.stripe.customers, "create").resolves({
        id: "cus_new",
      } as unknown as Stripe.Response<Stripe.Customer>);
      sinon
        .stub(stripeUtils.stripe.paymentMethods, "attach")
        .resolves({} as unknown as Stripe.Response<Stripe.PaymentMethod>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_new_tier_2",
      } as unknown as Stripe.Response<Stripe.Product>);
      sinon.stub(stripeUtils.stripe.subscriptions, "create").resolves({
        id: "sub_new_999",
      } as unknown as Stripe.Response<Stripe.Subscription>);
      const cancelStub = sinon
        .stub(stripeUtils.stripe.subscriptions, "cancel")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);

      await finalizeSubscriptionSetup({
        stripeAccountId: "acct_sub_finalize",
        paymentMethodId: "pm_test",
        tierId: newTier.id,
        amount: 1000,
        currency: "usd",
        userId: buyer.id,
        userEmail: buyer.email,
        oldStripeSubscriptionKey: "sub_old_789",
      });

      const newSubscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, profileSubscriptionTierId: newTier.id },
      });
      assert.ok(newSubscription, "the new tier's subscription should exist");
      assert.equal(newSubscription?.stripeSubscriptionKey, "sub_new_999");

      assert.equal(
        cancelStub.calledOnce,
        true,
        "the old Stripe subscription is cancelled only now, after the new one succeeded"
      );

      const oldSubscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, profileSubscriptionTierId: oldTier.id },
      });
      assert.equal(
        oldSubscription,
        null,
        "the old tier's subscription row should be gone after the switch is confirmed"
      );
    });

    it("finds and cancels the old tier's subscription even when oldTierId wasn't supplied", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_finalize_late_identity",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const oldTier = await createTier(profile.id, { minAmount: 500 });
      const newTier = await createTier(profile.id, { minAmount: 1000 });

      await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: oldTier.id,
          userId: buyer.id,
          amount: 500,
          stripeSubscriptionKey: "sub_old_late_789",
          deleteReason: "USER_CANCELLED",
        },
      });

      sinon.stub(stripeUtils.stripe.customers, "list").resolves({
        data: [],
      } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Customer>>);
      sinon.stub(stripeUtils.stripe.customers, "create").resolves({
        id: "cus_late_identity",
      } as unknown as Stripe.Response<Stripe.Customer>);
      sinon
        .stub(stripeUtils.stripe.paymentMethods, "attach")
        .resolves({} as unknown as Stripe.Response<Stripe.PaymentMethod>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_late_identity",
      } as unknown as Stripe.Response<Stripe.Product>);
      sinon.stub(stripeUtils.stripe.subscriptions, "create").resolves({
        id: "sub_new_late_999",
      } as unknown as Stripe.Response<Stripe.Subscription>);
      const cancelStub = sinon
        .stub(stripeUtils.stripe.subscriptions, "cancel")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);

      await finalizeSubscriptionSetup({
        stripeAccountId: "acct_sub_finalize_late_identity",
        paymentMethodId: "pm_test",
        tierId: newTier.id,
        amount: 1000,
        currency: "usd",
        userId: buyer.id,
        userEmail: buyer.email,
      });

      assert.equal(
        cancelStub.calledOnceWith("sub_old_late_789"),
        true,
        "should discover and cancel the old Stripe subscription by looking it up via userId"
      );

      const oldSubscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, profileSubscriptionTierId: oldTier.id },
      });
      assert.equal(
        oldSubscription,
        null,
        "the old tier's subscription row should be gone, not left as a stale duplicate"
      );

      const newSubscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, profileSubscriptionTierId: newTier.id },
      });
      assert.ok(newSubscription, "the new tier's subscription should exist");
    });

    it("cancels the old Stripe subscription on a same-tier re-authorization even when oldTierId wasn't supplied", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_finalize_same_tier",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, { minAmount: 500 });

      await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: tier.id,
          userId: buyer.id,
          amount: 500,
          stripeSubscriptionKey: "sub_same_tier_old",
        },
      });

      sinon.stub(stripeUtils.stripe.customers, "list").resolves({
        data: [],
      } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Customer>>);
      sinon.stub(stripeUtils.stripe.customers, "create").resolves({
        id: "cus_same_tier",
      } as unknown as Stripe.Response<Stripe.Customer>);
      sinon
        .stub(stripeUtils.stripe.paymentMethods, "attach")
        .resolves({} as unknown as Stripe.Response<Stripe.PaymentMethod>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_same_tier",
      } as unknown as Stripe.Response<Stripe.Product>);
      sinon.stub(stripeUtils.stripe.subscriptions, "create").resolves({
        id: "sub_same_tier_new",
      } as unknown as Stripe.Response<Stripe.Subscription>);
      const cancelStub = sinon
        .stub(stripeUtils.stripe.subscriptions, "cancel")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);

      await finalizeSubscriptionSetup({
        stripeAccountId: "acct_sub_finalize_same_tier",
        paymentMethodId: "pm_test",
        tierId: tier.id,
        amount: 500,
        currency: "usd",
        userId: buyer.id,
        userEmail: buyer.email,
      });

      assert.equal(
        cancelStub.calledOnceWith("sub_same_tier_old"),
        true,
        "should discover and cancel the old Stripe subscription even though it's for the same tier"
      );

      const subscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, profileSubscriptionTierId: tier.id },
      });
      assert.equal(
        subscription?.stripeSubscriptionKey,
        "sub_same_tier_new",
        "the row should now point at the new Stripe subscription"
      );
    });

    it("cancels every other paid subscription to the artist, not just the one being switched from", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_finalize_duplicates",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const strayTier = await createTier(profile.id, { minAmount: 500 });
      const oldTier = await createTier(profile.id, { minAmount: 700 });
      const newTier = await createTier(profile.id, { minAmount: 1000 });

      // A buyer left with two live paid subscriptions to the same artist
      await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: strayTier.id,
          userId: buyer.id,
          amount: 500,
          stripeSubscriptionKey: "sub_stray_dup",
        },
      });
      await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: oldTier.id,
          userId: buyer.id,
          amount: 700,
          stripeSubscriptionKey: "sub_old_dup",
        },
      });

      sinon.stub(stripeUtils.stripe.customers, "list").resolves({
        data: [],
      } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Customer>>);
      sinon.stub(stripeUtils.stripe.customers, "create").resolves({
        id: "cus_duplicates",
      } as unknown as Stripe.Response<Stripe.Customer>);
      sinon
        .stub(stripeUtils.stripe.paymentMethods, "attach")
        .resolves({} as unknown as Stripe.Response<Stripe.PaymentMethod>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_duplicates",
      } as unknown as Stripe.Response<Stripe.Product>);
      sinon.stub(stripeUtils.stripe.subscriptions, "create").resolves({
        id: "sub_new_dup",
      } as unknown as Stripe.Response<Stripe.Subscription>);
      const cancelStub = sinon
        .stub(stripeUtils.stripe.subscriptions, "cancel")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);

      await finalizeSubscriptionSetup({
        stripeAccountId: "acct_sub_finalize_duplicates",
        paymentMethodId: "pm_test",
        tierId: newTier.id,
        amount: 1000,
        currency: "usd",
        userId: buyer.id,
        userEmail: buyer.email,
        oldStripeSubscriptionKey: "sub_old_dup",
      });

      assert.deepEqual(
        cancelStub
          .getCalls()
          .map((call) => call.args[0])
          .sort(),
        ["sub_old_dup", "sub_stray_dup"],
        "both old Stripe subscriptions should be cancelled"
      );

      const remaining = await prisma.profileUserSubscription.findMany({
        where: { userId: buyer.id },
      });
      assert.equal(remaining.length, 1, "only the new tier's row is left");
      assert.equal(remaining[0].profileSubscriptionTierId, newTier.id);
      assert.equal(remaining[0].stripeSubscriptionKey, "sub_new_dup");
    });

    it("falls back to the artist's defaultPlatformFee when the tier has no platformPercent override", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_finalize_fee_fallback",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id, {
        defaultPlatformFee: 30,
      });
      const tier = await createTier(profile.id, {
        minAmount: 1000,
        platformPercent: null,
      });

      sinon.stub(stripeUtils.stripe.customers, "list").resolves({
        data: [],
      } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Customer>>);
      sinon.stub(stripeUtils.stripe.customers, "create").resolves({
        id: "cus_fee_fallback",
      } as unknown as Stripe.Response<Stripe.Customer>);
      sinon
        .stub(stripeUtils.stripe.paymentMethods, "attach")
        .resolves({} as unknown as Stripe.Response<Stripe.PaymentMethod>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_fee_fallback",
      } as unknown as Stripe.Response<Stripe.Product>);
      const createStub = sinon
        .stub(stripeUtils.stripe.subscriptions, "create")
        .resolves({
          id: "sub_fee_fallback",
        } as unknown as Stripe.Response<Stripe.Subscription>);

      await finalizeSubscriptionSetup({
        stripeAccountId: "acct_sub_finalize_fee_fallback",
        paymentMethodId: "pm_test",
        tierId: tier.id,
        amount: 1000,
        currency: "usd",
        userId: buyer.id,
        userEmail: buyer.email,
      });

      assert.equal(
        createStub.getCall(0).args[0]?.application_fee_percent,
        30,
        "should inherit the artist's 30% defaultPlatformFee when the tier has no override"
      );

      const subscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, profileSubscriptionTierId: tier.id },
      });
      assert.equal(subscription?.platformCut, 300);
    });

    it("persists a shippingAddress when the tier collects one", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_finalize_address",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, {
        minAmount: 500,
        collectAddress: true,
      });

      sinon.stub(stripeUtils.stripe.customers, "list").resolves({
        data: [],
      } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Customer>>);
      sinon.stub(stripeUtils.stripe.customers, "create").resolves({
        id: "cus_address",
      } as unknown as Stripe.Response<Stripe.Customer>);
      sinon
        .stub(stripeUtils.stripe.paymentMethods, "attach")
        .resolves({} as unknown as Stripe.Response<Stripe.PaymentMethod>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_address_tier",
      } as unknown as Stripe.Response<Stripe.Product>);
      sinon.stub(stripeUtils.stripe.subscriptions, "create").resolves({
        id: "sub_address_123",
      } as unknown as Stripe.Response<Stripe.Subscription>);

      const shippingAddress = {
        name: "Buyer Name",
        address: { line1: "123 Main St", city: "Anytown", country: "US" },
      };

      await finalizeSubscriptionSetup({
        stripeAccountId: "acct_sub_finalize_address",
        paymentMethodId: "pm_test",
        tierId: tier.id,
        amount: 500,
        currency: "usd",
        userId: buyer.id,
        userEmail: buyer.email,
        shippingAddress,
      });

      const subscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, profileSubscriptionTierId: tier.id },
      });
      assert.ok(subscription, "the subscription should be registered");
      assert.deepEqual(subscription?.shippingAddress, shippingAddress);
    });

    it("cancels the previous Stripe subscription even when re-authorising the same tier", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_finalize_same_tier",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, {
        minAmount: 500,
        collectAddress: true,
      });

      await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: tier.id,
          userId: buyer.id,
          amount: 500,
          stripeSubscriptionKey: "sub_same_tier_old",
        },
      });

      sinon.stub(stripeUtils.stripe.customers, "list").resolves({
        data: [],
      } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Customer>>);
      sinon.stub(stripeUtils.stripe.customers, "create").resolves({
        id: "cus_same_tier",
      } as unknown as Stripe.Response<Stripe.Customer>);
      sinon
        .stub(stripeUtils.stripe.paymentMethods, "attach")
        .resolves({} as unknown as Stripe.Response<Stripe.PaymentMethod>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_same_tier",
      } as unknown as Stripe.Response<Stripe.Product>);
      sinon.stub(stripeUtils.stripe.subscriptions, "create").resolves({
        id: "sub_same_tier_new",
      } as unknown as Stripe.Response<Stripe.Subscription>);
      const cancelStub = sinon
        .stub(stripeUtils.stripe.subscriptions, "cancel")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);

      await finalizeSubscriptionSetup({
        stripeAccountId: "acct_sub_finalize_same_tier",
        paymentMethodId: "pm_test",
        tierId: tier.id,
        amount: 500,
        currency: "usd",
        userId: buyer.id,
        userEmail: buyer.email,
        oldStripeSubscriptionKey: "sub_same_tier_old",
      });

      assert.equal(
        cancelStub.calledOnceWith("sub_same_tier_old"),
        true,
        "the old subscription should be cancelled by its own id, not swept up by a tier-based query"
      );

      const subscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, profileSubscriptionTierId: tier.id },
      });
      assert.equal(
        subscription?.stripeSubscriptionKey,
        "sub_same_tier_new",
        "the row now points at the new subscription"
      );
    });
  });

  describe("initiateSubscriptionPaymentMethodUpdate (direct)", () => {
    it("throws when the subscription has no stripeSubscriptionKey", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_pm_update_free",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, { minAmount: 0 });

      const subscription = await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: tier.id,
          userId: buyer.id,
          amount: 0,
        },
        include: { profileSubscriptionTier: true },
      });

      await assert.rejects(
        () => initiateSubscriptionPaymentMethodUpdate(subscription),
        /no payment method to update/
      );
    });

    it("creates a SetupIntent scoped to the subscription's existing customer", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_pm_update",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, { minAmount: 500 });

      const subscription = await prisma.profileUserSubscription.create({
        data: {
          profileSubscriptionTierId: tier.id,
          userId: buyer.id,
          amount: 500,
          stripeSubscriptionKey: "sub_pm_update_existing",
        },
        include: { profileSubscriptionTier: true },
      });

      sinon.stub(stripeUtils.stripe.subscriptions, "retrieve").resolves({
        customer: "cus_pm_update",
      } as unknown as Stripe.Response<Stripe.Subscription>);
      const setupIntentStub = sinon
        .stub(stripeUtils.stripe.setupIntents, "create")
        .resolves({
          id: "seti_pm_update",
          client_secret: "seti_pm_update_secret",
        } as unknown as Stripe.Response<Stripe.SetupIntent>);

      const result =
        await initiateSubscriptionPaymentMethodUpdate(subscription);

      assert.equal(result.clientSecret, "seti_pm_update_secret");
      assert.equal(result.stripeAccountId, "acct_pm_update");
      assert.equal(setupIntentStub.calledOnce, true);
      const [args] = setupIntentStub.getCall(0).args;
      assert.equal((args as any).customer, "cus_pm_update");
      assert.equal(
        (args as any).metadata?.subscriptionKey,
        "sub_pm_update_existing"
      );
    });
  });

  describe("handleSubscriptionPaymentMethodUpdateSucceeded (direct)", () => {
    it("updates the subscription's default_payment_method", async () => {
      const updateStub = sinon
        .stub(stripeUtils.stripe.subscriptions, "update")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);

      await stripeUtils.handleSubscriptionPaymentMethodUpdateSucceeded(
        {
          id: "seti_direct",
          payment_method: "pm_direct",
        } as unknown as Stripe.SetupIntent,
        "sub_direct_target",
        "acct_direct"
      );

      assert.equal(updateStub.calledOnce, true);
      assert.equal(updateStub.getCall(0).args[0], "sub_direct_target");
      assert.equal(
        (updateStub.getCall(0).args[1] as any)?.default_payment_method,
        "pm_direct"
      );
      assert.equal(
        (updateStub.getCall(0).args[2] as any)?.stripeAccount,
        "acct_direct"
      );
    });

    it("does nothing when the SetupIntent has no payment_method", async () => {
      const updateStub = sinon
        .stub(stripeUtils.stripe.subscriptions, "update")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);

      await stripeUtils.handleSubscriptionPaymentMethodUpdateSucceeded(
        { id: "seti_no_pm" } as unknown as Stripe.SetupIntent,
        "sub_direct_target",
        "acct_direct"
      );

      assert.equal(updateStub.called, false);
    });
  });

  describe("handleSetupIntentSucceeded (direct) — payment-method-update routing", () => {
    it("routes to handleSubscriptionPaymentMethodUpdateSucceeded and does not touch users/subscriptions creation", async () => {
      sinon.stub(stripeUtils.stripe.setupIntents, "retrieve").resolves({
        id: "seti_pm_route",
        payment_method: "pm_route",
      } as unknown as Stripe.Response<Stripe.SetupIntent>);
      const updateStub = sinon
        .stub(stripeUtils.stripe.subscriptions, "update")
        .resolves({} as unknown as Stripe.Response<Stripe.Subscription>);

      await stripeUtils.handleSetupIntentSucceeded({
        id: "seti_pm_route",
        metadata: {
          subscriptionKey: "sub_pm_route",
          stripeAccountId: "acct_pm_route",
        },
      } as unknown as Stripe.SetupIntent);

      assert.equal(updateStub.calledOnce, true);
      assert.equal(updateStub.getCall(0).args[0], "sub_pm_route");
      assert.equal(
        (updateStub.getCall(0).args[1] as any)?.default_payment_method,
        "pm_route"
      );
    });
  });

  describe("handleSetupIntentSucceeded (direct) — first-time subscription sign-up", () => {
    it("creates a new user with the self-chosen display name for an anonymous first-time subscriber", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_anon",
      });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, { minAmount: 500 });

      sinon.stub(stripeUtils.stripe.setupIntents, "retrieve").resolves({
        id: "seti_anon",
        payment_method: "pm_anon",
        metadata: {
          tierId: String(tier.id),
          amount: "500",
          currency: "usd",
          stripeAccountId: "acct_sub_anon",
          userEmail: "anon-supporter@test.com",
          userName: "Anon Supporter",
        },
      } as unknown as Stripe.Response<Stripe.SetupIntent>);
      sinon
        .stub(stripeUtils.stripe.customers, "list")
        .resolves({ data: [] } as unknown as Stripe.Response<
          Stripe.ApiList<Stripe.Customer>
        >);
      sinon.stub(stripeUtils.stripe.customers, "create").resolves({
        id: "cus_anon",
      } as unknown as Stripe.Response<Stripe.Customer>);
      sinon
        .stub(stripeUtils.stripe.paymentMethods, "attach")
        .resolves({} as unknown as Stripe.Response<Stripe.PaymentMethod>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_anon",
      } as unknown as Stripe.Response<Stripe.Product>);
      sinon.stub(stripeUtils.stripe.subscriptions, "create").resolves({
        id: "sub_anon_new",
      } as unknown as Stripe.Response<Stripe.Subscription>);
      const checkout = await prisma.checkout.create({
        data: {
          profileId: profile.id,
          items: [{ type: "subscription", tierId: tier.id }],
        },
      });

      await stripeUtils.handleSetupIntentSucceeded({
        id: "seti_anon",
        metadata: {
          tierId: String(tier.id),
          amount: "500",
          currency: "usd",
          stripeAccountId: "acct_sub_anon",
          userEmail: "anon-supporter@test.com",
          userName: "Anon Supporter",
          checkoutId: checkout.id,
        },
      } as unknown as Stripe.SetupIntent);

      const newUser = await prisma.user.findFirst({
        where: { email: "anon-supporter@test.com" },
      });
      assert.ok(
        newUser,
        "a new user should be created for the anonymous buyer"
      );
      assert.equal(newUser?.name, "Anon Supporter");

      const subscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: newUser?.id, profileSubscriptionTierId: tier.id },
      });
      assert.ok(subscription, "the subscription should be registered");
      assert.equal(subscription?.stripeSubscriptionKey, "sub_anon_new");

      const completed = await prisma.checkout.findUnique({
        where: { id: checkout.id },
      });
      assert.ok(completed?.completedAt, "the checkout should be completed");
    });

    it("parses the JSON-stringified shippingAddress metadata and persists it on the subscription", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_anon_address",
      });
      const profile = await createProfile(artistUser.id);
      const tier = await createTier(profile.id, {
        minAmount: 500,
        collectAddress: true,
      });

      const shippingAddress = {
        name: "Shipping Buyer",
        address: { line1: "456 Oak Ave", city: "Someplace", country: "GB" },
      };
      const metadata = {
        tierId: String(tier.id),
        amount: "500",
        currency: "usd",
        stripeAccountId: "acct_sub_anon_address",
        userEmail: "anon-shipping@test.com",
        shippingAddress: JSON.stringify(shippingAddress),
      };

      sinon.stub(stripeUtils.stripe.setupIntents, "retrieve").resolves({
        id: "seti_anon_address",
        payment_method: "pm_anon_address",
        metadata,
      } as unknown as Stripe.Response<Stripe.SetupIntent>);
      sinon
        .stub(stripeUtils.stripe.customers, "list")
        .resolves({ data: [] } as unknown as Stripe.Response<
          Stripe.ApiList<Stripe.Customer>
        >);
      sinon.stub(stripeUtils.stripe.customers, "create").resolves({
        id: "cus_anon_address",
      } as unknown as Stripe.Response<Stripe.Customer>);
      sinon
        .stub(stripeUtils.stripe.paymentMethods, "attach")
        .resolves({} as unknown as Stripe.Response<Stripe.PaymentMethod>);
      sinon.stub(stripeUtils.stripe.products, "create").resolves({
        id: "prod_anon_address",
      } as unknown as Stripe.Response<Stripe.Product>);
      sinon.stub(stripeUtils.stripe.subscriptions, "create").resolves({
        id: "sub_anon_address",
      } as unknown as Stripe.Response<Stripe.Subscription>);

      await stripeUtils.handleSetupIntentSucceeded({
        id: "seti_anon_address",
        metadata,
      } as unknown as Stripe.SetupIntent);

      const newUser = await prisma.user.findFirst({
        where: { email: "anon-shipping@test.com" },
      });
      assert.ok(
        newUser,
        "a new user should be created for the anonymous buyer"
      );

      const subscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: newUser?.id, profileSubscriptionTierId: tier.id },
      });
      assert.ok(subscription, "the subscription should be registered");
      assert.deepEqual(subscription?.shippingAddress, shippingAddress);
    });
  });

  describe("getIntentStatus (direct)", () => {
    it("reads the status and paying artist off a PaymentIntent", async () => {
      sinon.stub(stripeUtils.stripe.paymentIntents, "retrieve").resolves({
        id: "pi_status",
        status: "requires_payment_method",
        metadata: { artistId: "1" },
      } as unknown as Stripe.Response<Stripe.PaymentIntent>);

      const result = await getIntentStatus({
        id: "pi_status",
        stripeAccountId: "acct_test",
      });

      assert.deepEqual(result, {
        id: "pi_status",
        status: "requires_payment_method",
        profileId: "1",
      });
    });

    it("reads a seti_ id off the SetupIntent API instead, and tolerates metadata with no artist", async () => {
      const paymentIntents = sinon.stub(
        stripeUtils.stripe.paymentIntents,
        "retrieve"
      );
      sinon.stub(stripeUtils.stripe.setupIntents, "retrieve").resolves({
        id: "seti_status",
        status: "succeeded",
        metadata: {},
      } as unknown as Stripe.Response<Stripe.SetupIntent>);

      const result = await getIntentStatus({
        id: "seti_status",
        stripeAccountId: "acct_test",
      });

      assert.deepEqual(result, {
        id: "seti_status",
        status: "succeeded",
        profileId: null,
      });
      assert.equal(paymentIntents.callCount, 0);
    });
  });

  for (const method of ["get", "delete"] as const) {
    describe(`${method.toUpperCase()} /v1/purchase/:id`, () => {
      it("should return 401 when not logged in", async () => {
        const response = await requestApp[method]("purchase/pi_cancel_test")
          .query({ stripeAccountId: "acct_test" })
          .set("Accept", "application/json");
        assert.equal(response.statusCode, 401);
      });

      it("should return 400 when stripeAccountId query param is missing", async () => {
        const { accessToken } = await createUser({ email: "buyer@test.com" });
        const response = await requestApp[method]("purchase/pi_cancel_test")
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json");
        assert.equal(response.statusCode, 400);
      });

      it("should return 404 for an intent that was not initiated by Mirlo", async () => {
        const { accessToken } = await createUser({ email: "buyer@test.com" });
        const response = await requestApp[method]("purchase/pi_cancel_test")
          .query({ stripeAccountId: "acct_test" })
          .set("Cookie", [`jwt=${accessToken}`])
          .set("Accept", "application/json");
        assert.equal(response.statusCode, 404);
      });
    });
  }

  describe("cancel purchase (direct)", () => {
    const readerProcessingIntent = (intentId: string) =>
      ({
        id: "tmr_test",
        action: {
          status: "in_progress",
          type: "process_payment_intent",
          process_payment_intent: { payment_intent: intentId },
        },
      }) as unknown as Stripe.Response<Stripe.Terminal.Reader>;

    it("clears the reader action when the reader is still processing this intent", async () => {
      sinon
        .stub(stripeUtils.stripe.terminal.readers, "retrieve")
        .resolves(readerProcessingIntent("pi_cancel_me"));
      const cancelActionStub = sinon
        .stub(stripeUtils.stripe.terminal.readers, "cancelAction")
        .resolves();

      const cleared = await terminalUtils.cancelReaderActionForIntent({
        readerId: "tmr_test",
        intentId: "pi_cancel_me",
        stripeAccountId: "acct_test",
      });

      assert.equal(cleared, true);
      assert.ok(cancelActionStub.calledOnce);
      assert.equal(cancelActionStub.firstCall.args[0], "tmr_test");
    });

    it("leaves the reader alone when it has moved on to a different intent", async () => {
      sinon
        .stub(stripeUtils.stripe.terminal.readers, "retrieve")
        .resolves(readerProcessingIntent("pi_someone_elses_sale"));
      const cancelActionStub = sinon
        .stub(stripeUtils.stripe.terminal.readers, "cancelAction")
        .resolves();

      const cleared = await terminalUtils.cancelReaderActionForIntent({
        readerId: "tmr_test",
        intentId: "pi_cancel_me",
        stripeAccountId: "acct_test",
      });

      assert.equal(cleared, false);
      assert.ok(cancelActionStub.notCalled);
    });

    it("cancels both the reader action and the intent through the processor", async () => {
      sinon
        .stub(stripeUtils.stripe.terminal.readers, "retrieve")
        .resolves(readerProcessingIntent("pi_cancel_me"));
      const cancelActionStub = sinon
        .stub(stripeUtils.stripe.terminal.readers, "cancelAction")
        .resolves();
      const cancelIntentStub = sinon
        .stub(stripeUtils.stripe.paymentIntents, "cancel")
        .resolves({
          id: "pi_cancel_me",
          status: "canceled",
        } as unknown as Stripe.Response<Stripe.PaymentIntent>);

      const result = await getPaymentProcessor().cancel({
        id: "pi_cancel_me",
        accountId: "acct_test",
        readerId: "tmr_test",
      });

      assert.equal(result.id, "pi_cancel_me");
      assert.equal(result.status, "canceled");
      assert.ok(cancelActionStub.calledOnce);
      assert.ok(cancelIntentStub.calledOnce);
      assert.equal(cancelIntentStub.firstCall.args[0], "pi_cancel_me");
    });

    it("cancels a SetupIntent for a seti_ prefixed id", async () => {
      const cancelSetupStub = sinon
        .stub(stripeUtils.stripe.setupIntents, "cancel")
        .resolves({
          id: "seti_cancel_me",
          status: "canceled",
        } as unknown as Stripe.Response<Stripe.SetupIntent>);

      const result = await getPaymentProcessor().cancel({
        id: "seti_cancel_me",
        accountId: "acct_test",
      });

      assert.equal(result.status, "canceled");
      assert.ok(cancelSetupStub.calledOnce);
    });

    it("cancels the orphaned intent when reader dispatch fails", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_orphan",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const profile = await createProfile(artistUser.id);
      const tg = await createTrackGroup(profile.id, { minPrice: 1000 });

      sinon.stub(stripeUtils.stripe.accounts, "retrieve").resolves({
        id: "acct_orphan",
        default_currency: "usd",
        country: "US",
      } as unknown as Stripe.Response<Stripe.Account>);
      sinon.stub(stripeUtils.stripe.paymentIntents, "create").resolves({
        id: "pi_orphan",
        client_secret: "secret",
      } as unknown as Stripe.Response<Stripe.PaymentIntent>);
      sinon
        .stub(terminalUtils, "processPaymentOnReader")
        .rejects(new Error("Reader is offline"));
      const cancelIntentStub = sinon
        .stub(stripeUtils.stripe.paymentIntents, "cancel")
        .resolves({
          id: "pi_orphan",
          status: "canceled",
        } as unknown as Stripe.Response<Stripe.PaymentIntent>);

      await assert.rejects(
        initiatePayment({
          readerId: "tmr_test",
          profileId: profile.id,
          items: [
            {
              type: "trackGroup",
              id: String(tg.id),
              quantity: 1,
              amount: 1000,
            },
          ],
          userEmail: buyer.email,
          userId: String(buyer.id),
        }),
        /Reader is offline/
      );

      assert.ok(
        cancelIntentStub.calledOnceWith("pi_orphan"),
        "the dangling intent should be canceled"
      );
    });
  });
});
