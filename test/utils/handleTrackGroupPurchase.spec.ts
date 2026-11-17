import * as dotenv from "dotenv";
dotenv.config();

import prisma from "@mirlo/prisma";

import assert from "assert";

import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";

import { sendMailQueue } from "../../src/queues/send-mail-queue";
import {
  AlbumPurchaseEmailType,
  ArtistPurchaseNotificationEmailType,
  handleTrackGroupPurchase,
} from "../../src/utils/handleFinishedTransactions";
import stripe from "../../src/utils/stripe";
import { completedPaymentFromIntent } from "../../src/utils/stripe/completedPayment";
import {
  clearTables,
  createProfile,
  createTrackGroup,
  createUser,
  fakePayment,
} from "../utils";

describe("handleTrackGroupPurchase", () => {
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

  it("should send out emails for track group purchase", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: profileOwner } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const profile = await createProfile(profileOwner.id);

    const trackGroup = await createTrackGroup(profile.id, {
      title: "Our Custom Title",
    });

    await handleTrackGroupPurchase(purchaser.id, trackGroup.id);

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[1];
    assert.equal(data0.template, "album-purchase-receipt");
    assert.equal(data0.message.to, "follower@follower.com");
    const locals0 = data0.locals as AlbumPurchaseEmailType;
    assert.equal(locals0.trackGroup.id, trackGroup.id);
    assert.equal(locals0.purchase.transaction?.amount, 0);
    const data1 = stub.getCall(1).args[1];
    assert.equal(data1.template, "artist-purchase-notification");
    assert.equal(data1.message.to, profileOwner.email);
    const locals1 = data1.locals as ArtistPurchaseNotificationEmailType;
    assert.equal(
      locals1.transactions[0].trackGroupPurchases?.[0].trackGroup.id,
      trackGroup.id
    );
    assert.equal(locals1.transactions[0]?.amount, 0);
    assert.equal(locals1.transactions[0]?.platformCut, 0);
    assert.equal(locals1.transactions[0]?.stripeCut, 0);
  });

  it("should send out emails for track group purchase without log-in", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: profileOwner } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const profile = await createProfile(profileOwner.id);

    const trackGroup = await createTrackGroup(profile.id, {
      title: "Our Custom Title",
    });

    await handleTrackGroupPurchase(
      purchaser.id,
      trackGroup.id,
      undefined,
      true
    );

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[1];
    assert.equal(data0.template, "album-download");
    assert.equal(data0.message.to, "follower@follower.com");
    const locals0 = data0.locals as AlbumPurchaseEmailType;
    assert.equal(locals0.trackGroup.id, trackGroup.id);
    assert.equal(locals0.purchase.transaction?.amount, 0);
    const data1 = stub.getCall(1).args[1];
    assert.equal(data1.template, "artist-purchase-notification");
    assert.equal(data1.message.to, profileOwner.email);
    const locals1 = data1.locals as ArtistPurchaseNotificationEmailType;
    assert.equal(
      locals1.transactions[0].trackGroupPurchases?.[0].trackGroup.id,
      trackGroup.id
    );
    assert.equal(locals1.transactions[0]?.amount, 0);
    assert.equal(locals1.transactions[0]?.platformCut, 0);
    assert.equal(locals1.transactions[0]?.stripeCut, 0);
  });

  it("should send artist notification to paymentToUser if set", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: profileOwner } = await createUser({
      email: "artist@artist.com",
    });

    const { user: paymentRecipient } = await createUser({
      email: "payments@manager.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const profile = await createProfile(profileOwner.id, {
      paymentToUserId: paymentRecipient.id,
    });

    const trackGroup = await createTrackGroup(profile.id, {
      title: "Our Custom Title",
    });

    await handleTrackGroupPurchase(purchaser.id, trackGroup.id);

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[1];
    assert.equal(data0.template, "album-purchase-receipt");
    assert.equal(data0.message.to, "follower@follower.com");

    const data1 = stub.getCall(1).args[1];
    assert.equal(data1.template, "artist-purchase-notification");
    assert.equal(
      data1.message.to,
      "payments@manager.com",
      "artist notification should go to paymentToUser email"
    );
    const locals1 = data1.locals as ArtistPurchaseNotificationEmailType;
    assert.equal(
      locals1.transactions[0].trackGroupPurchases?.[0].trackGroup.id,
      trackGroup.id
    );
  });

  it("records the purchase and still notifies when the Stripe fee lookup fails", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();
    // Simulate a Stripe outage while fetching the application fee. This used to
    // throw and abort the whole handler, so the charge succeeded in Stripe but
    // left no purchase record and sent no emails (#issue).
    sinon
      .stub(stripe.charges, "retrieve")
      .rejects(new Error("Stripe is unreachable"));

    const { user: profileOwner } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const profile = await createProfile(profileOwner.id);

    const trackGroup = await createTrackGroup(profile.id, {
      title: "Our Custom Title",
    });

    const payment = await completedPaymentFromIntent(
      {
        id: "pi_test_123",
        amount_received: 1000,
        currency: "usd",
        latest_charge: "ch_test_123",
        metadata: {},
      } as unknown as Stripe.PaymentIntent,
      "acct_123"
    );
    await handleTrackGroupPurchase(purchaser.id, trackGroup.id, payment);

    const purchase = await prisma.userTrackGroupPurchase.findFirst({
      where: { userId: purchaser.id, trackGroupId: trackGroup.id },
    });
    assert.ok(
      purchase,
      "purchase should be recorded even when the fee lookup fails"
    );

    assert.equal(
      stub.calledTwice,
      true,
      "both the buyer receipt and the artist notification should still be sent"
    );
    assert.equal(
      stub.getCall(1).args[1].template,
      "artist-purchase-notification"
    );
  });

  const paid = (id: string) => fakePayment({ id, amount: 1000 });

  it("should number sales per seller across a label's artists", async () => {
    sinon.stub(sendMailQueue, "add").resolves();
    const { user: label } = await createUser({ email: "label@label.com" });
    const { user: artistOwner } = await createUser({
      email: "artist@artist.com",
    });
    const { user: firstBuyer } = await createUser({
      email: "first@buyer.com",
    });
    const { user: secondBuyer } = await createUser({
      email: "second@buyer.com",
    });
    const owned = await createProfile(label.id);
    const signed = await createProfile(artistOwner.id, {
      paymentToUserId: label.id,
    });
    const ownedAlbum = await createTrackGroup(owned.id, { title: "One" });
    const signedAlbum = await createTrackGroup(signed.id, { title: "Two" });

    const first = await handleTrackGroupPurchase(
      firstBuyer.id,
      ownedAlbum.id,
      paid("pi_1")
    );
    const second = await handleTrackGroupPurchase(
      secondBuyer.id,
      signedAlbum.id,
      paid("pi_2")
    );

    const numbers = await prisma.userTransaction.findMany({
      where: { id: { in: [first!.id, second!.id] } },
      orderBy: { createdAt: "asc" },
    });
    assert.deepEqual(
      numbers.map((t) => t.userFriendlyId),
      ["0001", "0002"]
    );
  });

  it("should number a buyer's sales from each seller separately", async () => {
    sinon.stub(sendMailQueue, "add").resolves();
    const { user: firstSeller } = await createUser({ email: "a@seller.com" });
    const { user: secondSeller } = await createUser({ email: "b@seller.com" });
    const { user: buyer } = await createUser({ email: "buyer@buyer.com" });
    const firstAlbum = await createTrackGroup(
      (await createProfile(firstSeller.id)).id
    );
    const secondAlbum = await createTrackGroup(
      (await createProfile(secondSeller.id)).id
    );

    await handleTrackGroupPurchase(buyer.id, firstAlbum.id, paid("pi_1"));
    await handleTrackGroupPurchase(buyer.id, secondAlbum.id, paid("pi_2"));

    const transactions = await prisma.userTransaction.findMany({
      where: { userId: buyer.id },
    });
    assert.deepEqual(
      transactions.map((t) => t.userFriendlyId),
      ["0001", "0001"]
    );
  });

  it("should not number a free purchase", async () => {
    sinon.stub(sendMailQueue, "add").resolves();
    const { user: seller } = await createUser({ email: "seller@seller.com" });
    const { user: buyer } = await createUser({ email: "buyer@buyer.com" });
    const album = await createTrackGroup((await createProfile(seller.id)).id);

    const transaction = await handleTrackGroupPurchase(buyer.id, album.id);

    const saved = await prisma.userTransaction.findFirstOrThrow({
      where: { id: transaction!.id },
    });
    assert.equal(saved.userFriendlyId, null);
  });

  it("should pass all variables required by artist-purchase-notification template", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    const { user: profileOwner } = await createUser({
      email: "artist@artist.com",
    });
    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const profile = await createProfile(profileOwner.id);

    const trackGroup = await createTrackGroup(profile.id, {
      title: "Our Custom Title",
    });

    await handleTrackGroupPurchase(purchaser.id, trackGroup.id);

    assert.equal(stub.calledTwice, true);
    const data = stub.getCall(1).args[1];
    assert.equal(data.template, "artist-purchase-notification");

    const locals = data.locals as ArtistPurchaseNotificationEmailType;

    // html.pug line: Purchased by: #{email}
    assert.equal(locals.email, "follower@follower.com");
    // html.pug line: Gross (#{currency.toUpperCase()})
    assert.equal(typeof locals.currency, "string");
    // html.pug link: ${client}/${purchase.trackGroup.artist.urlSlug}/release/...
    assert.ok(locals.client, "client must be present for template links");
    // html.pug totals row: #{(totalGross / 100).toFixed(2)}
    assert.equal(typeof locals.totalGross, "number");
    // html.pug totals row: #{(totalNet / 100).toFixed(2)}
    assert.equal(typeof locals.totalNet, "number");

    const tx = locals.transactions[0];
    assert.ok(tx, "transaction must be present");
    const tgp = tx.trackGroupPurchases?.[0];
    assert.ok(tgp, "trackGroupPurchase must be present");
    // html.pug mixin title: `Digital: ${purchase.trackGroup.artist.name} \ ${purchase.trackGroup.title}`
    assert.ok(
      tgp.trackGroup.artist.name,
      "artist.name must be included in the transaction query"
    );
    // html.pug link: `${client}/${purchase.trackGroup.artist.urlSlug}/release/${purchase.trackGroup.urlSlug}`
    assert.ok(
      tgp.trackGroup.artist.urlSlug,
      "artist.urlSlug must be included in the transaction query"
    );
    assert.ok(
      tgp.trackGroup.urlSlug,
      "trackGroup.urlSlug must be included in the transaction query"
    );
  });
});
