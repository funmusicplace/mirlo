import * as dotenv from "dotenv";
dotenv.config();

import assert from "assert";

import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";

import * as sendMail from "../../src/jobs/send-mail";
import { completePurchaseFromIntent } from "../../src/utils/stripe";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../utils";

import prisma from "@mirlo/prisma";

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
    sinon.stub(sendMail, "default").resolves();

    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const artist = await createArtist(artistUser.id);
    const tg = await createTrackGroup(artist.id, { minPrice: 500 });

    const intent = {
      id: "pi_identity_recovered",
      amount_received: 500,
      currency: "usd",
      receipt_email: "recovered@test.com",
      metadata: {
        purchaseType: "trackGroup",
        trackGroupId: String(tg.id),
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
    sinon.stub(sendMail, "default").resolves();

    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const artist = await createArtist(artistUser.id);
    const tg = await createTrackGroup(artist.id, { minPrice: 500 });

    const intent = {
      id: "pi_identity_metadata_wins",
      amount_received: 500,
      currency: "usd",
      receipt_email: "someone-else@test.com",
      metadata: {
        purchaseType: "trackGroup",
        trackGroupId: String(tg.id),
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

    const intent = {
      id: "pi_identity_unrecoverable",
      amount_received: 500,
      currency: "usd",
      metadata: {
        purchaseType: "trackGroup",
        trackGroupId: String(tg.id),
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
});
