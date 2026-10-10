import * as dotenv from "dotenv";

dotenv.config();
import assert from "node:assert";

import prisma from "@mirlo/prisma";
import { describe, it } from "mocha";
import sinon from "sinon";

import * as sendMail from "../../src/jobs/send-mail";
import { completePurchase } from "../../src/utils/handleFinishedTransactions";
import {
  clearTables,
  createArtist,
  createMerch,
  createTrackGroup,
  createUser,
  fakePayment,
} from "../utils";

// A cart is one payment: one transaction, every item attached to it. Routing
// used to follow a single purchaseType, so a two-album cart recorded only the
// first album and an album + merch cart recorded only the merch.
describe("completePurchase", () => {
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

  it("records every album in a two-album cart against one transaction", async () => {
    sinon.stub(sendMail, "default").resolves();
    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const artist = await createArtist(artistUser.id);
    const tg1 = await createTrackGroup(artist.id, { title: "Album One" });
    const tg2 = await createTrackGroup(artist.id, { title: "Album Two" });

    await completePurchase(
      buyer.id,
      [
        { type: "trackGroup", id: String(tg1.id), quantity: 1, amount: 1000 },
        { type: "trackGroup", id: String(tg2.id), quantity: 1, amount: 500 },
      ],
      fakePayment({ id: "pi_two_albums", amount: 1500 })
    );

    const transactions = await prisma.userTransaction.findMany({
      where: { userId: buyer.id },
      include: { trackGroupPurchases: true },
    });
    assert.equal(transactions.length, 1, "one payment, one transaction");
    assert.equal(transactions[0].amount, 1500);
    assert.deepEqual(
      transactions[0].trackGroupPurchases.map((p) => p.trackGroupId).sort(),
      [tg1.id, tg2.id].sort()
    );
  });

  it("records both the album and the merch in a mixed cart, and notifies the artist once", async () => {
    const mail = sinon.stub(sendMail, "default").resolves();
    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const artist = await createArtist(artistUser.id);
    const tg = await createTrackGroup(artist.id);
    const merch = await createMerch(artist.id, { quantityRemaining: 5 });

    await completePurchase(
      buyer.id,
      [
        { type: "trackGroup", id: String(tg.id), quantity: 1, amount: 1000 },
        { type: "merch", id: merch.id, quantity: 1, amount: 800 },
      ],
      fakePayment({ id: "pi_mixed", amount: 1800 })
    );

    const transaction = await prisma.userTransaction.findFirst({
      where: { userId: buyer.id },
      include: { trackGroupPurchases: true, merchPurchases: true },
    });
    assert.equal(transaction?.trackGroupPurchases.length, 1);
    assert.equal(transaction?.merchPurchases.length, 1);

    const templates = mail.getCalls().map((c) => c.args[0].data.template);
    assert.deepEqual(templates.sort(), [
      "album-purchase-receipt",
      "artist-purchase-notification",
      "purchase-receipt",
    ]);
  });

  it("uses each item's own message", async () => {
    sinon.stub(sendMail, "default").resolves();
    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const artist = await createArtist(artistUser.id);
    const tg = await createTrackGroup(artist.id);

    await completePurchase(
      buyer.id,
      [
        {
          type: "trackGroup",
          id: String(tg.id),
          quantity: 1,
          amount: 1000,
          message: "Love this record",
        },
      ],
      fakePayment({ amount: 1000 })
    );

    const purchase = await prisma.userTrackGroupPurchase.findFirst({
      where: { userId: buyer.id, trackGroupId: tg.id },
    });
    assert.equal(purchase?.message, "Love this record");
  });

  it("records a payment only once when the webhook is delivered twice", async () => {
    sinon.stub(sendMail, "default").resolves();
    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const { user: buyer } = await createUser({ email: "buyer@test.com" });
    const artist = await createArtist(artistUser.id);
    const merch = await createMerch(artist.id, { quantityRemaining: 5 });
    const items = [
      { type: "merch" as const, id: merch.id, quantity: 1, amount: 800 },
    ];
    const payment = fakePayment({ id: "pi_delivered_twice", amount: 800 });

    await completePurchase(buyer.id, items, payment);
    await completePurchase(buyer.id, items, payment);

    const transactions = await prisma.userTransaction.findMany({
      where: { stripeId: "pi_delivered_twice" },
      include: { merchPurchases: true },
    });
    assert.equal(transactions.length, 1, "one transaction");
    assert.equal(
      transactions[0].merchPurchases.length,
      1,
      "one merch purchase"
    );
    const updated = await prisma.merch.findUnique({ where: { id: merch.id } });
    assert.equal(updated?.quantityRemaining, 4, "stock decremented once");
  });
});
