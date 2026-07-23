import * as dotenv from "dotenv";

dotenv.config();
import assert from "node:assert";

import { describe, it } from "mocha";
import Stripe from "stripe";
import prisma from "@mirlo/prisma";

import { handleMerchPurchasesFromIntent } from "../../src/utils/stripe";
import { clearTables, createArtist, createMerch, createUser } from "../utils";

// A bare-bones PaymentIntent with no `latest_charge` — getFeesFromPaymentIntent
// short-circuits without an actual Stripe call whenever that's absent, so these
// tests don't need to stub the Stripe SDK at all.
const fakeIntent = (overrides: Partial<Stripe.PaymentIntent> = {}) =>
  ({
    id: "pi_test",
    currency: "usd",
    application_fee_amount: 0,
    metadata: {},
    ...overrides,
  }) as Stripe.PaymentIntent;

describe("handleMerchPurchasesFromIntent", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("creates a MerchPurchase and decrements merch-level stock when there are no options", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const artist = await createArtist(artistUser.id);
    const merch = await createMerch(artist.id, { quantityRemaining: 5 });

    await handleMerchPurchasesFromIntent(
      buyer.id,
      [{ type: "merch", id: merch.id, quantity: 2, amount: 1600 }],
      fakeIntent(),
      "acct_test"
    );

    const purchase = await prisma.merchPurchase.findFirst({
      where: { merchId: merch.id },
    });
    assert.ok(purchase);
    assert.equal(purchase?.quantity, 2);

    const updatedMerch = await prisma.merch.findFirst({
      where: { id: merch.id },
    });
    assert.equal(updatedMerch?.quantityRemaining, 3);
  });

  it("connects selected options and decrements only their stock, not the merch-level stock", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const artist = await createArtist(artistUser.id);
    const merch = await createMerch(artist.id, { quantityRemaining: 5 });
    const optionType = await prisma.merchOptionType.create({
      data: { merchId: merch.id, optionName: "size" },
    });
    const option = await prisma.merchOption.create({
      data: {
        merchOptionTypeId: optionType.id,
        name: "small",
        quantityRemaining: 4,
        additionalPrice: 200,
      },
    });

    await handleMerchPurchasesFromIntent(
      buyer.id,
      [
        {
          type: "merch",
          id: merch.id,
          quantity: 1,
          amount: 1000,
          optionIds: [option.id],
        },
      ],
      fakeIntent(),
      "acct_test"
    );

    const purchase = await prisma.merchPurchase.findFirst({
      where: { merchId: merch.id },
      include: { options: true },
    });
    assert.ok(purchase);
    assert.equal(purchase?.options.length, 1);
    assert.equal(purchase?.options[0].id, option.id);

    const updatedOption = await prisma.merchOption.findFirst({
      where: { id: option.id },
    });
    assert.equal(updatedOption?.quantityRemaining, 3);

    const updatedMerch = await prisma.merch.findFirst({
      where: { id: merch.id },
    });
    assert.equal(
      updatedMerch?.quantityRemaining,
      5,
      "merch-level stock is untouched when the purchase decremented an option instead"
    );
  });

  it("stores the shipping address from the PaymentIntent's `shipping` field", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const artist = await createArtist(artistUser.id);
    const merch = await createMerch(artist.id, {});

    await handleMerchPurchasesFromIntent(
      buyer.id,
      [{ type: "merch", id: merch.id, quantity: 1, amount: 1000 }],
      fakeIntent({
        shipping: {
          name: "Ada Lovelace",
          address: {
            line1: "1 Analytical Engine Way",
            line2: null,
            city: "London",
            state: "",
            postal_code: "SW1A 1AA",
            country: "GB",
          },
        },
      }),
      "acct_test"
    );

    const purchase = await prisma.merchPurchase.findFirst({
      where: { merchId: merch.id },
    });
    assert.ok(purchase);
    const shippingAddress = purchase?.shippingAddress as {
      name: string;
      address: { city: string };
    };
    assert.equal(shippingAddress.name, "Ada Lovelace");
    assert.equal(shippingAddress.address.city, "London");
  });
});
