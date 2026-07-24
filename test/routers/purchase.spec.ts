import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";

import { getClient } from "../../src/utils/getClient";
import { getPaymentProcessor } from "../../src/utils/payments/PaymentProcessor";
import { initiatePayment } from "../../src/utils/payments/purchase";
import {
  initiateOnlineSubscription,
  initiateSubscription,
} from "../../src/utils/payments/subscription";
import * as stripeUtils from "../../src/utils/stripe";
import { finalizeSubscriptionSetup } from "../../src/utils/stripe";
import * as terminalUtils from "../../src/utils/stripe/terminal";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
  createMerch,
  createMerchShippingDestination,
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

    it("should return 200 with clientSecret for a first-time online subscription", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_online",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const tier = await createTier(artist.id, { minAmount: 500 });

      sinon.stub(stripeUtils.stripe.setupIntents, "create").resolves({
        id: "seti_online_new",
        client_secret: "seti_online_new_secret",
      } as unknown as Stripe.Response<Stripe.SetupIntent>);

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
          items: [{ type: "subscription", tierId: tier.id }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.clientSecret, "seti_online_new_secret");
    });

    it("should return 401 when a readerId is supplied without being logged in", async () => {
      const { user } = await createUser({ email: "artist@test.com" });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id, { minAmount: 500 });
      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
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
      const artist = await createArtist(artistUser.id);
      const tier = await createTier(artist.id, { minAmount: 500 });
      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
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

    it("should return 404 when track does not belong to the given artist", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
      });
      const { user: otherUser } = await createUser({ email: "other@test.com" });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const otherArtist = await createArtist(otherUser.id, {
        urlSlug: "other-artist-2",
      });
      const tgFromOther = await createTrackGroup(otherArtist.id, {
        minPrice: 1000,
      });
      const trackFromOther = await createTrack(tgFromOther.id, {
        minPrice: 1000,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
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
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 0 });
      const track = await createTrack(tg.id, { minPrice: 0 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
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
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 0 });
      const track = await createTrack(tg.id, { minPrice: 500 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
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
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 0 });
      const track = await createTrack(tg.id, { minPrice: 500 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
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
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 1000 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
          items: [{ type: "trackGroup", id: tg.id, price: "1000" }],
          hosted: true,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      // Hosted mode returns a redirect to Mirlo's pay page, not a raw secret.
      assert.ok(response.body.redirectUrl, "should return a redirectUrl");
      assert.ok(response.body.redirectUrl.includes("/checkout"));
      assert.ok(response.body.redirectUrl.includes("paymentIntentId="));
      assert.ok(response.body.redirectUrl.includes("stripeAccountId="));
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
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 1000 });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
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
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 1000 });
      // getClient() seeds the "frontend" client at http://localhost:8080 in test.
      const client = await getClient();

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
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
      // The frontend needs the connected account id to load Stripe.js.
      assert.equal(response.body.stripeAccountId, "acct_tip_test");
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
        quantityRemaining: 10,
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

    it("should return 200 with clientSecret for a merch purchase with options and a shipping destination", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_merch_options_test",
      });
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const merch = await createMerch(artist.id, {
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
          artistId: artist.id,
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
      const artist = await createArtist(artistUser.id);
      const merch = await createMerch(artist.id, {
        isPublic: true,
        minPrice: 800,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
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
      const artist = await createArtist(artistUser.id);
      const merch = await createMerch(artist.id, {
        isPublic: true,
        minPrice: 800,
        quantityRemaining: 1,
      });

      const response = await requestApp
        .post("purchase")
        .send({
          artistId: artist.id,
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
      const artist = await createArtist(artistUser.id);
      const merch = await createMerch(artist.id, {
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
          artistId: artist.id,
          items: [{ type: "merch", id: merch.id, quantity: 1 }],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });
  });

  // These tests call initiatePayment / initiateSubscription directly so sinon stubs
  // work (same process), without going through the HTTP API container.
  describe("initiatePayment (direct)", () => {
    // Stubs the two Stripe calls initiatePayment makes for an *online* purchase:
    // the connected-account currency lookup and the PaymentIntent creation.
    // Returns the create stub so tests can assert on the params/metadata that
    // initiatePayment hands to Stripe.
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

    it("tags a single online trackGroup purchase with purchaseType 'trackGroup' and its trackGroupId", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_meta_tg",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 1000 });

      const createStub = stubStripeForOnline();

      const result = await initiatePayment({
        artistId: artist.id,
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
      // Regression guard: a Set built over item *objects* never collapsed to a
      // single unique type, so a trackGroup cart wrongly defaulted to "merch"
      // (and shipped without a trackGroupId), so the webhook never recorded it.
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_meta_multi_tg",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const tg1 = await createTrackGroup(artist.id, {
        title: "First album",
        minPrice: 1000,
      });
      const tg2 = await createTrackGroup(artist.id, {
        title: "Second album",
        minPrice: 500,
      });

      const createStub = stubStripeForOnline();

      await initiatePayment({
        artistId: artist.id,
        items: [
          { type: "trackGroup", id: String(tg1.id), quantity: 1, amount: 1000 },
          { type: "trackGroup", id: String(tg2.id), quantity: 1, amount: 500 },
        ],
        userEmail: buyer.email,
        userId: String(buyer.id),
      });

      const metadata = metadataOf(createStub);
      assert.equal(metadata.purchaseType, "trackGroup");
      // trackGroupId points at the first trackGroup in the cart.
      assert.equal(metadata.trackGroupId, String(tg1.id));
    });

    it("tags a single online track purchase with purchaseType 'track' and its trackId", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_meta_track",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 0 });
      const track = await createTrack(tg.id, { minPrice: 500 });

      const createStub = stubStripeForOnline();

      const result = await initiatePayment({
        artistId: artist.id,
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
      const artist = await createArtist(artistUser.id);

      const createStub = stubStripeForOnline();

      await initiatePayment({
        artistId: artist.id,
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
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 1000 });

      const createStub = stubStripeForOnline();

      await initiatePayment({
        artistId: artist.id,
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
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 1000 });

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
        artistId: artist.id,
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
      assert.equal(metadata.artistId, String(artist.id));

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

  describe("initiateOnlineSubscription (direct) — tier switching", () => {
    it("reprices the existing subscription in place instead of cancelling it, when no address collection is needed", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_switch",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const oldTier = await createTier(artist.id, { minAmount: 500 });
      const newTier = await createTier(artist.id, {
        minAmount: 1000,
        collectAddress: false,
        platformPercent: 12,
      });

      const existing = await prisma.profileUserSubscription.create({
        data: {
          artistSubscriptionTierId: oldTier.id,
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
        artistId: artist.id,
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
      assert.equal(after?.artistSubscriptionTierId, newTier.id);
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

    it("does not cancel the old subscription up front when a fresh SetupIntent is needed", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_switch_2",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const oldTier = await createTier(artist.id, { minAmount: 500 });
      const newTier = await createTier(artist.id, {
        minAmount: 1000,
        collectAddress: true,
      });

      await prisma.profileUserSubscription.create({
        data: {
          artistSubscriptionTierId: oldTier.id,
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
        artistId: artist.id,
        tierId: newTier.id,
        userEmail: buyer.email,
        userId: buyer.id,
      });

      assert.equal("clientSecret" in result, true);

      // The bug fix: nothing about the old subscription changes just because
      // a new SetupIntent was created — cancellation is deferred until the
      // new subscription is actually confirmed (finalizeSubscriptionSetup).
      const oldSubscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, artistSubscriptionTierId: oldTier.id },
      });
      assert.ok(
        oldSubscription,
        "the old subscription must still exist — it is not cancelled before the new one is confirmed"
      );
      assert.equal(oldSubscription?.deleteReason, null);
    });
  });

  describe("finalizeSubscriptionSetup (direct)", () => {
    it("creates the subscription and only cancels the old tier once the new one is confirmed", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_finalize",
      });
      const { user: buyer } = await createUser({ email: "buyer@test.com" });
      const artist = await createArtist(artistUser.id);
      const oldTier = await createTier(artist.id, { minAmount: 500 });
      const newTier = await createTier(artist.id, { minAmount: 1000 });

      await prisma.profileUserSubscription.create({
        data: {
          artistSubscriptionTierId: oldTier.id,
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
        oldTierId: oldTier.id,
      });

      const newSubscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, artistSubscriptionTierId: newTier.id },
      });
      assert.ok(newSubscription, "the new tier's subscription should exist");
      assert.equal(newSubscription?.stripeSubscriptionKey, "sub_new_999");

      assert.equal(
        cancelStub.calledOnce,
        true,
        "the old Stripe subscription is cancelled only now, after the new one succeeded"
      );

      const oldSubscription = await prisma.profileUserSubscription.findFirst({
        where: { userId: buyer.id, artistSubscriptionTierId: oldTier.id },
      });
      assert.equal(
        oldSubscription,
        null,
        "the old tier's subscription row should be gone after the switch is confirmed"
      );
    });
  });

  describe("handleSetupIntentSucceeded (direct) — first-time subscription sign-up", () => {
    it("creates a new user with the self-chosen display name for an anonymous first-time subscriber", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_sub_anon",
      });
      const artist = await createArtist(artistUser.id);
      const tier = await createTier(artist.id, { minAmount: 500 });

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

      await stripeUtils.handleSetupIntentSucceeded({
        id: "seti_anon",
        metadata: {
          tierId: String(tier.id),
          amount: "500",
          currency: "usd",
          stripeAccountId: "acct_sub_anon",
          userEmail: "anon-supporter@test.com",
          userName: "Anon Supporter",
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
        where: { userId: newUser?.id, artistSubscriptionTierId: tier.id },
      });
      assert.ok(subscription, "the subscription should be registered");
      assert.equal(subscription?.stripeSubscriptionKey, "sub_anon_new");
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
      // The hosted checkout page reads the secret from here.
      assert.ok(
        "clientSecret" in response.body.result,
        "should include a clientSecret field"
      );
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

  describe("DELETE /v1/purchase/:id", () => {
    it("should return 401 when not logged in", async () => {
      const response = await requestApp
        .delete("purchase/pi_cancel_test")
        .query({ stripeAccountId: "acct_test" })
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 401);
    });

    it("should return 400 when stripeAccountId query param is missing", async () => {
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const response = await requestApp
        .delete("purchase/pi_cancel_test")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 400);
    });

    it("should return 404 for an intent that was not initiated by Mirlo", async () => {
      // stripe-mock returns a canned PaymentIntent with empty metadata, i.e.
      // no artistId — exactly what a foreign (non-Mirlo) intent looks like.
      const { accessToken } = await createUser({ email: "buyer@test.com" });
      const response = await requestApp
        .delete("purchase/pi_cancel_test")
        .query({ stripeAccountId: "acct_test" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404);
    });
  });

  // Direct-call tests for the cancellation plumbing, same pattern as
  // "initiatePayment (direct)" above: sinon stubs only work in-process.
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
      const artist = await createArtist(artistUser.id);
      const tg = await createTrackGroup(artist.id, { minPrice: 1000 });

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
          artistId: artist.id,
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
