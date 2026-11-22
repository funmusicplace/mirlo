import * as dotenv from "dotenv";
dotenv.config();

import assert from "assert";

import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";

import { sendMailQueue } from "../../src/queues/send-mail-queue";
import { completePurchaseFromIntent } from "../../src/utils/stripe";
import {
  clearTables,
  createCheckout,
  createProfile,
  createTrack,
  createTrackGroup,
  createUser,
} from "../utils";

import prisma from "@mirlo/prisma";

// Covers the webhook-side routing added when track purchases moved onto the
// unified POST /v1/purchase flow: a succeeded PaymentIntent tagged
// purchaseType "track" should record a UserTrackPurchase, the same way
// purchaseType "trackGroup" already records a UserTrackGroupPurchase.
describe("completePurchaseFromIntent - track routing", () => {
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

  it("records a UserTrackPurchase for a succeeded PaymentIntent tagged purchaseType 'track'", async () => {
    sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const profile = await createProfile(artistUser.id);
    const tg = await createTrackGroup(profile.id, { minPrice: 0 });
    const track = await createTrack(tg.id, { minPrice: 500 });
    const checkout = await createCheckout(profile.id, [
      { type: "track", id: String(track.id), quantity: 1, amount: 500 },
    ]);

    const intent = {
      id: "pi_track_webhook_test",
      amount_received: 500,
      currency: "usd",
      metadata: {
        purchaseType: "track",
        checkoutId: checkout.id,
        artistId: String(profile.id),
        userId: String(buyer.id),
        userEmail: buyer.email,
      },
    } as unknown as Stripe.PaymentIntent;

    await completePurchaseFromIntent(intent, "acct_track_webhook");

    const purchase = await prisma.userTrackPurchase.findFirst({
      where: { userId: buyer.id, trackId: track.id },
      include: { transaction: true },
    });
    assert.ok(purchase, "a UserTrackPurchase should have been created");
    assert.equal(purchase?.transaction?.amount, 500);
  });

  it("takes the track's message from its checkout", async () => {
    sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const profile = await createProfile(artistUser.id);
    const tg = await createTrackGroup(profile.id, { minPrice: 0 });
    const track = await createTrack(tg.id, { minPrice: 500 });
    const message = "x".repeat(600);
    const checkout = await createCheckout(profile.id, [
      {
        type: "track",
        id: String(track.id),
        quantity: 1,
        amount: 500,
        message,
      },
    ]);

    const intent = {
      id: "pi_track_checkout_message",
      amount_received: 500,
      currency: "usd",
      metadata: {
        purchaseType: "track",
        artistId: String(profile.id),
        userId: String(buyer.id),
        userEmail: buyer.email,
        checkoutId: checkout.id,
      },
    } as unknown as Stripe.PaymentIntent;

    await completePurchaseFromIntent(intent, "acct_track_webhook");

    const purchase = await prisma.userTrackPurchase.findFirst({
      where: { userId: buyer.id, trackId: track.id },
    });
    assert.equal(purchase?.message, message);
  });

  it("reads an older intent's items from its metadata, with the message from its checkout", async () => {
    sinon.stub(sendMailQueue, "add").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const profile = await createProfile(artistUser.id);
    const tg = await createTrackGroup(profile.id, { minPrice: 0 });
    const track = await createTrack(tg.id, { minPrice: 500 });
    const message = "x".repeat(600);
    const checkout = await prisma.checkout.create({
      data: {
        profileId: profile.id,
        items: [{ type: "track", id: track.id, message }],
      },
    });

    const intent = {
      id: "pi_track_legacy_metadata",
      amount_received: 500,
      currency: "usd",
      metadata: {
        purchaseType: "track",
        items: JSON.stringify([
          { type: "track", id: String(track.id), quantity: 1, amount: 500 },
        ]),
        artistId: String(profile.id),
        userId: String(buyer.id),
        userEmail: buyer.email,
        checkoutId: checkout.id,
      },
    } as unknown as Stripe.PaymentIntent;

    await completePurchaseFromIntent(intent, "acct_track_webhook");

    const purchase = await prisma.userTrackPurchase.findFirst({
      where: { userId: buyer.id, trackId: track.id },
    });
    assert.equal(purchase?.message, message);
  });

  it("refuses a 'track' intent that carries no items", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const profile = await createProfile(artistUser.id);

    const intent = {
      id: "pi_track_missing_id",
      amount_received: 500,
      currency: "usd",
      metadata: {
        purchaseType: "track",
        artistId: String(profile.id),
        userId: String(buyer.id),
        userEmail: buyer.email,
      },
    } as unknown as Stripe.PaymentIntent;

    await assert.rejects(
      completePurchaseFromIntent(intent, "acct_track_webhook_2"),
      /no items found/
    );

    const count = await prisma.userTrackPurchase.count({
      where: { userId: buyer.id },
    });
    assert.equal(count, 0);
  });
});
