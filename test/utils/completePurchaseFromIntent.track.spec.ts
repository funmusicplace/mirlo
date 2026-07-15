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
  createTrack,
  createTrackGroup,
  createUser,
} from "../utils";

import prisma from "@mirlo/prisma";

// Covers the webhook-side routing added when track purchases moved onto the
// unified POST /v1/purchase flow: a succeeded PaymentIntent tagged
// purchaseType "track" (+ trackId) should record a UserTrackPurchase, the
// same way purchaseType "trackGroup" already records a UserTrackGroupPurchase.
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
    sinon.stub(sendMail, "default").resolves();

    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const artist = await createArtist(artistUser.id);
    const tg = await createTrackGroup(artist.id, { minPrice: 0 });
    const track = await createTrack(tg.id, { minPrice: 500 });

    const intent = {
      id: "pi_track_webhook_test",
      amount_received: 500,
      currency: "usd",
      metadata: {
        purchaseType: "track",
        trackId: String(track.id),
        artistId: String(artist.id),
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

  it("does nothing when purchaseType is 'track' but trackId is missing", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const artist = await createArtist(artistUser.id);

    const intent = {
      id: "pi_track_missing_id",
      amount_received: 500,
      currency: "usd",
      metadata: {
        purchaseType: "track",
        artistId: String(artist.id),
        userId: String(buyer.id),
        userEmail: buyer.email,
      },
    } as unknown as Stripe.PaymentIntent;

    await completePurchaseFromIntent(intent, "acct_track_webhook_2");

    const count = await prisma.userTrackPurchase.count({
      where: { userId: buyer.id },
    });
    assert.equal(count, 0);
  });
});
