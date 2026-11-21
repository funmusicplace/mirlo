import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";

import { sendMailQueue } from "../../src/queues/send-mail-queue";
import { completePurchaseFromIntent } from "../../src/utils/stripe";
import {
  clearTables,
  createArtist,
  createCheckout,
  createMerch,
  createTrackGroup,
  createUser,
} from "../utils";
dotenv.config();

describe("completePurchaseFromIntent - buyer identity recovery", () => {
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

  it("recovers the buyer from receipt_email when the metadata carries no identity", async () => {
    sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const artist = await createArtist(artistUser.id);
    const tg = await createTrackGroup(artist.id, { minPrice: 500 });

    const checkout = await createCheckout(artist.id, [
      { type: "trackGroup", id: String(tg.id), quantity: 1, amount: 500 },
    ]);

    const intent = {
      id: "pi_identity_recovered",
      amount_received: 500,
      currency: "usd",
      receipt_email: "recovered@test.com",
      metadata: {
        purchaseType: "trackGroup",
        checkoutId: checkout.id,
        artistId: String(artist.id),
      },
    } as unknown as Stripe.PaymentIntent;

    await completePurchaseFromIntent(intent, "acct_identity_recovery");

    const buyer = await prisma.user.findFirst({
      where: { email: "recovered@test.com" },
    });
    assert.ok(buyer, "a user should have been created from receipt_email");

    const purchase = await prisma.userTrackGroupPurchase.findFirst({
      where: { userId: buyer!.id, trackGroupId: tg.id },
    });
    assert.ok(purchase, "the purchase should be recorded against that user");
  });

  it("prefers the metadata email over receipt_email when both are present", async () => {
    sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const artist = await createArtist(artistUser.id);
    const tg = await createTrackGroup(artist.id, { minPrice: 500 });

    const checkout = await createCheckout(artist.id, [
      { type: "trackGroup", id: String(tg.id), quantity: 1, amount: 500 },
    ]);

    const intent = {
      id: "pi_identity_metadata_wins",
      amount_received: 500,
      currency: "usd",
      receipt_email: "someone-else@test.com",
      metadata: {
        purchaseType: "trackGroup",
        checkoutId: checkout.id,
        artistId: String(artist.id),
        userId: String(buyer.id),
        userEmail: buyer.email,
      },
    } as unknown as Stripe.PaymentIntent;

    await completePurchaseFromIntent(intent, "acct_identity_metadata");

    const purchase = await prisma.userTrackGroupPurchase.findFirst({
      where: { trackGroupId: tg.id },
    });
    assert.equal(purchase?.userId, buyer.id);
    const strayUser = await prisma.user.findFirst({
      where: { email: "someone-else@test.com" },
    });
    assert.equal(strayUser, null, "receipt_email should not have been used");
  });

  it("throws rather than recording a purchase against nobody", async () => {
    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const artist = await createArtist(artistUser.id);
    const tg = await createTrackGroup(artist.id, { minPrice: 500 });

    const checkout = await createCheckout(artist.id, [
      { type: "trackGroup", id: String(tg.id), quantity: 1, amount: 500 },
    ]);

    const intent = {
      id: "pi_identity_unrecoverable",
      amount_received: 500,
      currency: "usd",
      metadata: {
        purchaseType: "trackGroup",
        checkoutId: checkout.id,
        artistId: String(artist.id),
      },
    } as unknown as Stripe.PaymentIntent;

    await assert.rejects(() =>
      completePurchaseFromIntent(intent, "acct_identity_none")
    );

    const count = await prisma.userTrackGroupPurchase.count({
      where: { trackGroupId: tg.id },
    });
    assert.equal(count, 0);
  });

  it("records a merch and tip sale with no buyer when there's nobody to credit", async () => {
    const mail = sinon.stub(sendMailQueue, "add").resolves();
    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const artist = await createArtist(artistUser.id);
    const merch = await createMerch(artist.id, { quantityRemaining: 5 });

    const checkout = await createCheckout(artist.id, [
      { type: "merch", id: merch.id, quantity: 1, amount: 1000 },
      { type: "tip", quantity: 1, amount: 500 },
    ]);

    const intent = {
      id: "pi_identity_walk_up",
      amount_received: 1500,
      currency: "usd",
      metadata: {
        purchaseType: "merch",
        checkoutId: checkout.id,
        artistId: String(artist.id),
        pointOfSale: "true",
      },
    } as unknown as Stripe.PaymentIntent;

    await completePurchaseFromIntent(intent, "acct_identity_walk_up");

    const transaction = await prisma.userTransaction.findFirst({
      where: { stripeId: "pi_identity_walk_up" },
      include: { merchPurchases: true, tips: true },
    });
    assert.equal(transaction?.userId, null);
    assert.equal(transaction?.merchPurchases[0]?.userId, null);
    assert.equal(transaction?.tips[0]?.userId, null);

    const [[, job]] = mail.args;
    assert.equal(mail.callCount, 1);
    assert.equal(job.template, "artist-purchase-notification");
    assert.equal(job.message.to, "artist@test.com");
    assert.equal(job.locals.email, null);
  });

  it("doesn't credit a point-of-sale sale to the email Stripe collected", async () => {
    sinon.stub(sendMailQueue, "add").resolves();
    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const artist = await createArtist(artistUser.id);
    const merch = await createMerch(artist.id, { quantityRemaining: 5 });

    const checkout = await createCheckout(artist.id, [
      { type: "merch", id: merch.id, quantity: 1, amount: 1000 },
    ]);

    const intent = {
      id: "pi_identity_pos_link",
      amount_received: 1000,
      currency: "usd",
      receipt_email: "seller@test.com",
      metadata: {
        purchaseType: "merch",
        checkoutId: checkout.id,
        artistId: String(artist.id),
        pointOfSale: "true",
      },
    } as unknown as Stripe.PaymentIntent;

    await completePurchaseFromIntent(intent, "acct_identity_pos_link");

    const transaction = await prisma.userTransaction.findFirst({
      where: { stripeId: "pi_identity_pos_link" },
    });
    assert.equal(transaction?.userId, null);
    const seller = await prisma.user.findFirst({
      where: { email: "seller@test.com" },
    });
    assert.equal(seller, null);
  });
});
