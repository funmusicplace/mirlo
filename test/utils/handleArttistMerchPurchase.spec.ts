import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createMerch,
  createTrackGroup,
  createUser,
} from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import sinon from "sinon";
import * as sendMail from "../../src/jobs/send-mail";
import { handleArtistMerchPurchase } from "../../src/utils/handleFinishedTransactions";
import Stripe from "stripe";
import stripe from "../../src/utils/stripe";

const stripeAccountId = "hke";

describe("handleArtistMerchPurchase", () => {
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

  it("should send out emails for merch purchase", async () => {
    const stub = sinon.spy(sendMail, "default");
    sinon
      .stub(stripe.products, "retrieve")
      // @ts-ignore
      .returns({ metadata: {} });

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const productKey = "productKey";

    const merch = await createMerch(artist.id, {
      title: "Our Custom Title",
      stripeProductKey: productKey,
    });

    await handleArtistMerchPurchase(
      purchaser.id,
      {
        line_items: {
          data: [{ price: { product: productKey } } as Stripe.LineItem],
        } as Stripe.ApiList<Stripe.LineItem>,
      } as Stripe.Checkout.Session,
      stripeAccountId
    );

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "artist-merch-purchase-receipt");
    assert.equal(data0.message.to, "follower@follower.com");
    assert.equal(data0.locals.purchases[0].merchId, merch.id);
    assert.equal(data0.locals.purchases[0].amountPaid, 0);

    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "tell-artist-about-merch-purchase");
    assert.equal(data1.message.to, artistUser.email);
    assert.equal(data0.locals.purchases[0].merchId, merch.id);
    assert.equal(data0.locals.purchases[0].amountPaid, 0);
  });

  it("should reduce quantity from merch.quantityRemaining", async () => {
    sinon
      .stub(stripe.products, "retrieve")
      // @ts-ignore
      .returns({ metadata: {} });

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const productKey = "productKey";

    const merch = await createMerch(artist.id, {
      title: "Our Custom Title",
      stripeProductKey: productKey,
      quantityRemaining: 10,
    });

    await handleArtistMerchPurchase(
      purchaser.id,
      {
        metadata: {
          quantity: "1",
        } as Stripe.Metadata,
        line_items: {
          data: [{ price: { product: productKey } } as Stripe.LineItem],
        } as Stripe.ApiList<Stripe.LineItem>,
      } as Stripe.Checkout.Session,
      stripeAccountId
    );

    const updatedMerch = await prisma.merch.findFirst({
      where: { id: merch.id },
    });

    assert.equal(updatedMerch?.quantityRemaining, 9);
  });

  it("should reduce quantity from merchOptions.quantityRemaining", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const productKey = "productKey";

    const merch = await createMerch(artist.id, {
      title: "Our Custom Title",
      stripeProductKey: productKey,
    });

    const merchOptions = await prisma.merchOptionType.create({
      data: {
        optionName: "size",
        merchId: merch.id,
        options: {
          create: [
            {
              name: "small",
              quantityRemaining: 10,
            },
            {
              name: "large",
              quantityRemaining: 10,
            },
          ],
        },
      },
      include: {
        options: true,
      },
    });

    sinon.stub(stripe.products, "retrieve").returns({
      // @ts-ignore
      metadata: {
        merchOptionIds: `${merchOptions.options[0].id}`,
      },
    });

    console.log("merchOptions", merchOptions);

    await handleArtistMerchPurchase(
      purchaser.id,
      {
        metadata: {
          quantity: "1",
        } as Stripe.Metadata,
        line_items: {
          data: [{ price: { product: productKey } } as Stripe.LineItem],
        } as Stripe.ApiList<Stripe.LineItem>,
      } as Stripe.Checkout.Session,
      stripeAccountId
    );

    const updatedMerch = await prisma.merch.findFirst({
      where: { id: merch.id },
      include: { optionTypes: { include: { options: true } } },
    });
    console.log("updatedMerch", updatedMerch?.optionTypes[0].options);
  });

  it("should send correct price in emails", async () => {
    const stub = sinon.spy(sendMail, "default");
    sinon
      .stub(stripe.products, "retrieve")
      // @ts-ignore
      .returns({ metadata: {} });

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const productKey = "productKey";

    const merch = await createMerch(artist.id, {
      title: "Our Custom Title",
      stripeProductKey: productKey,
    });

    await handleArtistMerchPurchase(
      purchaser.id,
      {
        line_items: {
          data: [
            {
              price: { product: productKey },
              amount_total: 2000,
            } as Stripe.LineItem,
          ],
        } as Stripe.ApiList<Stripe.LineItem>,
      } as Stripe.Checkout.Session,
      stripeAccountId
    );

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "artist-merch-purchase-receipt");
    assert.equal(data0.message.to, "follower@follower.com");
    assert.equal(data0.locals.purchases[0].merchId, merch.id);
    assert.equal(data0.locals.purchases[0].amountPaid, 2000);
    assert.equal(data0.locals.purchases[0].artistCut, 1800);
    assert.equal(data0.locals.purchases[0].platformCut, 200);

    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "tell-artist-about-merch-purchase");
    assert.equal(data1.message.to, artistUser.email);
    assert.equal(data0.locals.purchases[0].merchId, merch.id);
    assert.equal(data0.locals.purchases[0].amountPaid, 2000);
  });

  it("should add a related trackgroup to the users' collection", async () => {
    sinon
      .stub(stripe.products, "retrieve")
      // @ts-ignore
      .returns({ metadata: {} });

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const trackGroup = await createTrackGroup(artist.id, {
      title: "trackgroup tittle",
    });

    const productKey = "productKey";

    const merch = await createMerch(artist.id, {
      title: "Our Custom Title",
      stripeProductKey: productKey,
      includePurchaseTrackGroupId: trackGroup.id,
    });

    await handleArtistMerchPurchase(
      purchaser.id,
      {
        line_items: {
          data: [
            {
              price: { product: productKey },
              amount_total: 2000,
            } as Stripe.LineItem,
          ],
        } as Stripe.ApiList<Stripe.LineItem>,
      } as Stripe.Checkout.Session,
      stripeAccountId
    );

    const ownedTG = await prisma.userTrackGroupPurchase.findFirst({
      where: { userId: purchaser.id },
    });

    assert.equal(ownedTG?.trackGroupId, trackGroup.id);
  });

  it("should handle the case where a user aleady owns the related trackgroup", async () => {
    sinon
      .stub(stripe.products, "retrieve")
      // @ts-ignore
      .returns({ metadata: {} });

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const trackGroup = await createTrackGroup(artist.id, {
      title: "trackgroup tittle",
    });

    const tgpurchase = await prisma.userTrackGroupPurchase.create({
      data: { trackGroupId: trackGroup.id, userId: purchaser.id, pricePaid: 0 },
    });

    const productKey = "productKey";

    const merch = await createMerch(artist.id, {
      title: "Our Custom Title",
      stripeProductKey: productKey,
      includePurchaseTrackGroupId: trackGroup.id,
    });

    await handleArtistMerchPurchase(
      purchaser.id,
      {
        line_items: {
          data: [
            {
              price: { product: productKey },
              amount_total: 2000,
            } as Stripe.LineItem,
          ],
        } as Stripe.ApiList<Stripe.LineItem>,
      } as Stripe.Checkout.Session,
      stripeAccountId
    );

    const ownedTG = await prisma.userTrackGroupPurchase.findMany({
      where: { userId: purchaser.id },
    });

    assert.equal(ownedTG?.[0].trackGroupId, trackGroup.id);
    assert.equal(ownedTG.length, 1);
  });

  it("should handle options", async () => {
    const stub = sinon.spy(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const productKey = "productKey";

    const merch = await createMerch(artist.id, {
      title: "Our Custom Title",
      stripeProductKey: productKey,
    });

    const merchOptions = await prisma.merchOptionType.create({
      data: {
        optionName: "size",
        merchId: merch.id,
        options: {
          create: [
            {
              name: "small",
            },
            {
              name: "large",
            },
          ],
        },
      },
      include: {
        options: true,
      },
    });

    sinon.stub(stripe.products, "retrieve").returns({
      // @ts-ignore
      metadata: {
        merchOptionIds: merchOptions.options[0].id,
      },
    });

    await handleArtistMerchPurchase(
      purchaser.id,
      {
        line_items: {
          data: [
            {
              price: { product: productKey },
              amount_total: 2000,
            } as Stripe.LineItem,
          ],
        } as Stripe.ApiList<Stripe.LineItem>,
      } as Stripe.Checkout.Session,
      stripeAccountId
    );

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "artist-merch-purchase-receipt");
    assert.equal(data0.message.to, "follower@follower.com");
    assert.equal(data0.locals.purchases[0].merchId, merch.id);
    assert.equal(data0.locals.purchases[0].amountPaid, 2000);
    assert.equal(data0.locals.purchases[0].artistCut, 1800);
    assert.equal(data0.locals.purchases[0].platformCut, 200);
    assert.equal(data0.locals.purchases[0].options[0].name, "small");
    assert.equal(data0.locals.purchases[0].options.length, 1);

    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "tell-artist-about-merch-purchase");
    assert.equal(data1.message.to, artistUser.email);
    assert.equal(data0.locals.purchases[0].merchId, merch.id);
    assert.equal(data0.locals.purchases[0].amountPaid, 2000);

    const purchase = await prisma.merchPurchase.findFirst({
      where: { userId: purchaser.id },
      include: { options: true },
    });
    assert.equal(purchase?.options.length, 1);
    assert.equal(purchase?.options[0].name, "small");
  });
});
