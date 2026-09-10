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
} from "../../src/utils/stripe";
import {
  clearTables,
  createArtist,
  createMerch,
  createTier,
  createUser,
} from "../utils";

const stripeAccountId = "acct_test";

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
