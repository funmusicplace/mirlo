import * as dotenv from "dotenv";
dotenv.config();

import assert from "node:assert";

import prisma from "@mirlo/prisma";
import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";

import stripe, {
  createMerchStripeProduct,
  createSubscriptionStripeProduct,
  createTrackGroupStripeProduct,
  createTrackStripeProduct,
} from "../../src/utils/stripe";
import {
  clearTables,
  createArtist,
  createMerch,
  createTier,
  createTrack,
  createTrackGroup,
  createUser,
} from "../utils";

const stripeAccountId = "acct_test";

// The four createXStripeProduct functions (merch/trackGroup/track/subscription)
// all funnel through the same shared createOrReuseStripeProduct core in
// stripe/index.ts — checkForProductKey, then create-and-persist if nothing was
// found. These tests exercise that shared reuse/recreate/persist behavior
// through each of the four public entry points.
describe("createXStripeProduct", () => {
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

  describe("createTrackGroupStripeProduct", () => {
    it("creates a new Stripe product and persists its key when none exists yet", async () => {
      const { user: artistUser } = await createUser({ email: "a@test.com" });
      const artist = await createArtist(artistUser.id);
      const trackGroup = await createTrackGroup(artist.id, {
        title: "New Album",
      });

      const createStub = sinon.stub(stripe.products, "create").resolves({
        id: "prod_new_tg",
        // @ts-ignore — only `id` is read by the caller
      } as Stripe.Response<Stripe.Product>);

      const fullTrackGroup = await prisma.trackGroup.findFirstOrThrow({
        where: { id: trackGroup.id },
        include: { profile: true, cover: true },
      });

      const productKey = await createTrackGroupStripeProduct(
        fullTrackGroup,
        stripeAccountId
      );

      assert.equal(productKey, "prod_new_tg");
      assert.ok(createStub.calledOnce);
      assert.equal(
        createStub.firstCall.args[0].name,
        `New Album by ${artist.name}`
      );

      const updated = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });
      assert.equal(
        updated?.stripeProductKey,
        "prod_new_tg",
        "should persist the new product key onto the trackGroup"
      );
    });

    it("reuses an existing valid stripeProductKey without creating a new product", async () => {
      const { user: artistUser } = await createUser({ email: "a@test.com" });
      const artist = await createArtist(artistUser.id);
      const trackGroup = await createTrackGroup(artist.id, {
        stripeProductKey: "prod_existing",
      });

      sinon.stub(stripe.products, "retrieve").resolves({
        id: "prod_existing",
        // @ts-ignore
      } as Stripe.Response<Stripe.Product>);
      const createStub = sinon.stub(stripe.products, "create");

      const fullTrackGroup = await prisma.trackGroup.findFirstOrThrow({
        where: { id: trackGroup.id },
        include: { profile: true, cover: true },
      });

      const productKey = await createTrackGroupStripeProduct(
        fullTrackGroup,
        stripeAccountId
      );

      assert.equal(productKey, "prod_existing");
      assert.equal(
        createStub.called,
        false,
        "should not create a new product when the existing key is still valid"
      );
    });

    it("creates and persists a fresh product when the stored key no longer exists on Stripe", async () => {
      const { user: artistUser } = await createUser({ email: "a@test.com" });
      const artist = await createArtist(artistUser.id);
      const trackGroup = await createTrackGroup(artist.id, {
        stripeProductKey: "prod_deleted",
      });

      sinon
        .stub(stripe.products, "retrieve")
        .rejects(new Error("No such product: prod_deleted"));
      const createStub = sinon.stub(stripe.products, "create").resolves({
        id: "prod_replacement",
        // @ts-ignore
      } as Stripe.Response<Stripe.Product>);

      const fullTrackGroup = await prisma.trackGroup.findFirstOrThrow({
        where: { id: trackGroup.id },
        include: { profile: true, cover: true },
      });

      const productKey = await createTrackGroupStripeProduct(
        fullTrackGroup,
        stripeAccountId
      );

      assert.equal(productKey, "prod_replacement");
      assert.ok(createStub.calledOnce);

      const updated = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });
      assert.equal(updated?.stripeProductKey, "prod_replacement");
    });
  });

  describe("createTrackStripeProduct", () => {
    it("creates a new product named after the track's own artists when set, persists the key", async () => {
      const { user: artistUser } = await createUser({ email: "a@test.com" });
      const artist = await createArtist(artistUser.id);
      const trackGroup = await createTrackGroup(artist.id, {});
      const track = await createTrack(trackGroup.id, { title: "A Song" });
      await prisma.trackArtist.create({
        data: { trackId: track.id, artistName: "Featured Artist" },
      });

      const createStub = sinon.stub(stripe.products, "create").resolves({
        id: "prod_new_track",
        // @ts-ignore
      } as Stripe.Response<Stripe.Product>);

      const fullTrack = await prisma.track.findFirstOrThrow({
        where: { id: track.id },
        include: {
          trackGroup: { include: { profile: true, cover: true } },
          trackArtists: true,
        },
      });

      const productKey = await createTrackStripeProduct(
        fullTrack,
        stripeAccountId
      );

      assert.equal(productKey, "prod_new_track");
      assert.equal(
        createStub.firstCall.args[0].name,
        "A Song by Featured Artist"
      );

      const updated = await prisma.track.findFirst({
        where: { id: track.id },
      });
      assert.equal(updated?.stripeProductKey, "prod_new_track");
    });
  });

  describe("createSubscriptionStripeProduct", () => {
    it("creates a new product with no tax_code/images and persists the key on the tier", async () => {
      const { user: artistUser } = await createUser({ email: "a@test.com" });
      const artist = await createArtist(artistUser.id);
      const tier = await createTier(artist.id, { name: "Gold" });

      const createStub = sinon.stub(stripe.products, "create").resolves({
        id: "prod_new_tier",
        // @ts-ignore
      } as Stripe.Response<Stripe.Product>);

      const fullTier = await prisma.profileSubscriptionTier.findFirstOrThrow({
        where: { id: tier.id },
        include: { profile: true },
      });

      const productKey = await createSubscriptionStripeProduct(
        fullTier,
        stripeAccountId
      );

      assert.equal(productKey, "prod_new_tier");
      assert.equal(
        createStub.firstCall.args[0].name,
        `Supporting ${artist.name} at Gold`
      );
      assert.equal(
        "tax_code" in createStub.firstCall.args[0],
        false,
        "subscription products don't set a tax_code, unlike merch/trackGroup/track"
      );

      const updated = await prisma.profileSubscriptionTier.findFirst({
        where: { id: tier.id },
      });
      assert.equal(updated?.stripeProductKey, "prod_new_tier");
    });
  });

  describe("createMerchStripeProduct", () => {
    it("creates a new product and persists the key when there are no options", async () => {
      const { user: artistUser } = await createUser({ email: "a@test.com" });
      const artist = await createArtist(artistUser.id);
      const merch = await createMerch(artist.id, { title: "T-Shirt" });

      const createStub = sinon.stub(stripe.products, "create").resolves({
        id: "prod_merch_no_options",
        // @ts-ignore
      } as Stripe.Response<Stripe.Product>);

      const fullMerch = await prisma.merch.findFirstOrThrow({
        where: { id: merch.id },
        include: { profile: true, images: true },
      });

      const productKey = await createMerchStripeProduct(
        fullMerch,
        stripeAccountId
      );

      assert.equal(productKey, "prod_merch_no_options");
      const updated = await prisma.merch.findFirst({
        where: { id: merch.id },
      });
      assert.equal(updated?.stripeProductKey, "prod_merch_no_options");
    });

    it("does not persist a stripeProductKey on the merch row when options are selected", async () => {
      const { user: artistUser } = await createUser({ email: "a@test.com" });
      const artist = await createArtist(artistUser.id);
      const merch = await createMerch(artist.id, { title: "T-Shirt" });
      const optionType = await prisma.merchOptionType.create({
        data: { merchId: merch.id, optionName: "size" },
      });
      const option = await prisma.merchOption.create({
        data: { merchOptionTypeId: optionType.id, name: "small" },
      });

      // No prior product for this option combination.
      sinon
        .stub(stripe.products, "search")
        .resolves({ data: [] } as unknown as Stripe.Response<
          Stripe.ApiSearchResult<Stripe.Product>
        >);
      const createStub = sinon.stub(stripe.products, "create").resolves({
        id: "prod_merch_with_options",
        // @ts-ignore
      } as Stripe.Response<Stripe.Product>);

      const fullMerch = await prisma.merch.findFirstOrThrow({
        where: { id: merch.id },
        include: { profile: true, images: true },
      });

      const productKey = await createMerchStripeProduct(
        fullMerch,
        stripeAccountId,
        { merchOptionIds: [option.id] }
      );

      assert.equal(productKey, "prod_merch_with_options");
      assert.ok(createStub.calledOnce);

      const updated = await prisma.merch.findFirst({
        where: { id: merch.id },
      });
      assert.equal(
        updated?.stripeProductKey,
        null,
        "merch with options should not have a single stripeProductKey stored on the row"
      );
    });

    it("reuses an existing product found by the option-combination search, without creating a new one", async () => {
      const { user: artistUser } = await createUser({ email: "a@test.com" });
      const artist = await createArtist(artistUser.id);
      const merch = await createMerch(artist.id, { title: "T-Shirt" });
      const optionType = await prisma.merchOptionType.create({
        data: { merchId: merch.id, optionName: "size" },
      });
      const option = await prisma.merchOption.create({
        data: { merchOptionTypeId: optionType.id, name: "small" },
      });

      sinon.stub(stripe.products, "search").resolves({
        data: [{ id: "prod_found_by_search" }],
      } as unknown as Stripe.Response<Stripe.ApiSearchResult<Stripe.Product>>);
      const createStub = sinon.stub(stripe.products, "create");

      const fullMerch = await prisma.merch.findFirstOrThrow({
        where: { id: merch.id },
        include: { profile: true, images: true },
      });

      const productKey = await createMerchStripeProduct(
        fullMerch,
        stripeAccountId,
        { merchOptionIds: [option.id] }
      );

      assert.equal(productKey, "prod_found_by_search");
      assert.equal(createStub.called, false);
    });
  });
});
