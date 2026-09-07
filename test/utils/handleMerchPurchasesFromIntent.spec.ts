import * as dotenv from "dotenv";

dotenv.config();
import assert from "node:assert";

import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";
import prisma from "@mirlo/prisma";

import * as sendMail from "../../src/jobs/send-mail";
import {
  ArtistPurchaseNotificationEmailType,
  PurchaseReceiptEmailType,
} from "../../src/utils/handleFinishedTransactions";
import stripe, { handleMerchPurchasesFromIntent } from "../../src/utils/stripe";
import {
  clearTables,
  createProfile,
  createMerch,
  createTrackGroup,
  createUser,
} from "../utils";

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

  afterEach(() => {
    sinon.restore();
  });

  it("creates a MerchPurchase and decrements merch-level stock when there are no options", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const profile = await createProfile(artistUser.id);
    const merch = await createMerch(profile.id, { quantityRemaining: 5 });

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
    const profile = await createProfile(artistUser.id);
    const merch = await createMerch(profile.id, { quantityRemaining: 5 });
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
    const profile = await createProfile(artistUser.id);
    const merch = await createMerch(profile.id, {});

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

  it("grants the bundled bonus track group when the merch item has includePurchaseTrackGroupId set", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const profile = await createProfile(artistUser.id);
    const bonusTrackGroup = await createTrackGroup(profile.id);
    const merch = await createMerch(profile.id, {
      includePurchaseTrackGroupId: bonusTrackGroup.id,
    });

    await handleMerchPurchasesFromIntent(
      buyer.id,
      [{ type: "merch", id: merch.id, quantity: 1, amount: 1000 }],
      fakeIntent(),
      "acct_test"
    );

    const grant = await prisma.userTrackGroupPurchase.findFirst({
      where: { trackGroupId: bonusTrackGroup.id, userId: buyer.id },
    });
    assert.ok(grant, "should grant the bonus track group to the buyer");
    assert.equal(grant?.proGratis, true);
  });

  it("does not grant a bonus track group when includePurchaseTrackGroupId is not set", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const profile = await createProfile(artistUser.id);
    const merch = await createMerch(profile.id, {});

    await handleMerchPurchasesFromIntent(
      buyer.id,
      [{ type: "merch", id: merch.id, quantity: 1, amount: 1000 }],
      fakeIntent(),
      "acct_test"
    );

    const grants = await prisma.userTrackGroupPurchase.findMany({
      where: { userId: buyer.id },
    });
    assert.equal(grants.length, 0);
  });

  it("does not fail the purchase when the buyer already owns the bundled bonus track group", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const profile = await createProfile(artistUser.id);
    const bonusTrackGroup = await createTrackGroup(profile.id);
    const merch = await createMerch(profile.id, {
      includePurchaseTrackGroupId: bonusTrackGroup.id,
    });

    await prisma.userTrackGroupPurchase.create({
      data: {
        trackGroupId: bonusTrackGroup.id,
        userId: buyer.id,
        proGratis: true,
      },
    });

    // Should not throw the underlying P2002 unique-constraint error.
    await handleMerchPurchasesFromIntent(
      buyer.id,
      [{ type: "merch", id: merch.id, quantity: 1, amount: 1000 }],
      fakeIntent(),
      "acct_test"
    );

    const grants = await prisma.userTrackGroupPurchase.findMany({
      where: { trackGroupId: bonusTrackGroup.id, userId: buyer.id },
    });
    assert.equal(grants.length, 1, "should not create a duplicate grant");
  });

  it("sends the buyer receipt and artist notification emails with the transaction and merch details", async () => {
    const stub = sinon.spy(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const profile = await createProfile(artistUser.id);
    const merch = await createMerch(profile.id, {});

    await handleMerchPurchasesFromIntent(
      buyer.id,
      [{ type: "merch", id: merch.id, quantity: 1, amount: 2000 }],
      fakeIntent({ metadata: { message: "Enjoy the merch!" } }),
      "acct_test"
    );

    assert.equal(stub.calledTwice, true);

    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "purchase-receipt");
    assert.equal(data0.message.to, "buyer@test.com");
    const locals0 = data0.locals as PurchaseReceiptEmailType;
    assert.equal(locals0.transactions[0].merchPurchases?.[0].merchId, merch.id);
    assert.equal(locals0.transactions[0].amount, 2000);

    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "artist-purchase-notification");
    assert.equal(data1.message.to, artistUser.email);
    const locals1 = data1.locals as ArtistPurchaseNotificationEmailType;
    assert.equal(locals1.transactions[0].merchPurchases?.[0].merchId, merch.id);
    assert.equal(locals1.transactions[0].amount, 2000);
    assert.equal(locals1.message, "Enjoy the merch!");
  });

  it("records the Stripe application fee and processing fee on the created transaction", async () => {
    sinon.stub(stripe.charges, "retrieve").resolves({
      balance_transaction: {
        fee_details: [{ type: "stripe_fee", amount: 75 }],
      },
      // @ts-ignore — only the fields getFeesFromPaymentIntent reads are needed
    } as Stripe.Response<Stripe.Charge>);

    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const profile = await createProfile(artistUser.id);
    const merch = await createMerch(profile.id, {});

    await handleMerchPurchasesFromIntent(
      buyer.id,
      [{ type: "merch", id: merch.id, quantity: 1, amount: 2000 }],
      fakeIntent({
        application_fee_amount: 200,
        latest_charge: "ch_123",
      }),
      "acct_test"
    );

    const transaction = await prisma.userTransaction.findFirst({
      where: { userId: buyer.id },
    });
    assert.ok(transaction);
    assert.equal(transaction?.amount, 2000);
    assert.equal(transaction?.platformCut, 200);
    assert.equal(transaction?.stripeCut, 75);
  });
});
