import * as dotenv from "dotenv";
dotenv.config();

import prisma from "@mirlo/prisma";

import assert from "assert";

import { describe, it } from "mocha";
import sinon from "sinon";
import Stripe from "stripe";

import * as sendMail from "../../src/jobs/send-mail";
import {
  AlbumPurchaseEmailType,
  ArtistPurchaseNotificationEmailType,
  handleTrackGroupPurchase,
} from "../../src/utils/handleFinishedTransactions";
import stripe from "../../src/utils/stripe";
import { clearTables, createTrackGroup, createUser } from "../utils";

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
    const stub = sinon.spy(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const trackGroup = await createTrackGroup(artist.id, {
      title: "Our Custom Title",
    });

    await handleTrackGroupPurchase(purchaser.id, trackGroup.id);

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "album-purchase-receipt");
    assert.equal(data0.message.to, "follower@follower.com");
    const locals0 = data0.locals as AlbumPurchaseEmailType;
    assert.equal(locals0.trackGroup.id, trackGroup.id);
    assert.equal(locals0.purchase.transaction?.amount, 0);
    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "artist-purchase-notification");
    assert.equal(data1.message.to, artistUser.email);
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
    const stub = sinon.spy(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const trackGroup = await createTrackGroup(artist.id, {
      title: "Our Custom Title",
    });

    await handleTrackGroupPurchase(
      purchaser.id,
      trackGroup.id,
      undefined,
      true
    );

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "album-download");
    assert.equal(data0.message.to, "follower@follower.com");
    const locals0 = data0.locals as AlbumPurchaseEmailType;
    assert.equal(locals0.trackGroup.id, trackGroup.id);
    assert.equal(locals0.purchase.transaction?.amount, 0);
    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "artist-purchase-notification");
    assert.equal(data1.message.to, artistUser.email);
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
    const stub = sinon.spy(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: paymentRecipient } = await createUser({
      email: "payments@manager.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        paymentToUserId: paymentRecipient.id,
      },
    });

    const trackGroup = await createTrackGroup(artist.id, {
      title: "Our Custom Title",
    });

    await handleTrackGroupPurchase(purchaser.id, trackGroup.id);

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "album-purchase-receipt");
    assert.equal(data0.message.to, "follower@follower.com");

    const data1 = stub.getCall(1).args[0].data;
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
    const stub = sinon.spy(sendMail, "default");
    // Simulate a Stripe outage while fetching the application fee. This used to
    // throw and abort the whole handler, so the charge succeeded in Stripe but
    // left no purchase record and sent no emails (#issue).
    sinon
      .stub(stripe.paymentIntents, "retrieve")
      .rejects(new Error("Stripe is unreachable"));

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const trackGroup = await createTrackGroup(artist.id, {
      title: "Our Custom Title",
    });

    await handleTrackGroupPurchase(purchaser.id, trackGroup.id, {
      id: "cs_test_123",
      amount_total: 1000,
      currency: "usd",
      payment_intent: "pi_test_123",
      metadata: { stripeAccountId: "acct_123" },
    } as unknown as Stripe.Checkout.Session);

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
      stub.getCall(1).args[0].data.template,
      "artist-purchase-notification"
    );
  });

  it("should increment userFriendlyId per user across multiple purchases", async () => {
    const stub = sinon.spy(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const trackGroup1 = await createTrackGroup(artist.id, {
      title: "Album One",
    });

    const trackGroup2 = await createTrackGroup(artist.id, {
      title: "Album Two",
    });

    // Make first purchase
    await handleTrackGroupPurchase(purchaser.id, trackGroup1.id);
    const firstTransaction = await prisma.userTransaction.findFirst({
      where: { userId: purchaser.id },
      orderBy: { createdAt: "asc" },
    });
    assert.equal(
      firstTransaction?.userFriendlyId,
      "0001",
      "first transaction should have ID 0001"
    );

    // Make second purchase
    await handleTrackGroupPurchase(purchaser.id, trackGroup2.id);
    const secondTransaction = await prisma.userTransaction.findFirst({
      where: { userId: purchaser.id },
      orderBy: { createdAt: "desc" },
    });
    assert.equal(
      secondTransaction?.userFriendlyId,
      "0002",
      "second transaction should have ID 0002"
    );

    // Verify count is correct
    const allTransactions = await prisma.userTransaction.findMany({
      where: { userId: purchaser.id },
      orderBy: { createdAt: "asc" },
    });
    assert.equal(allTransactions.length, 2);
    assert.equal(allTransactions[0].userFriendlyId, "0001");
    assert.equal(allTransactions[1].userFriendlyId, "0002");
  });

  it("should pass all variables required by artist-purchase-notification template", async () => {
    const stub = sinon.spy(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });
    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const trackGroup = await createTrackGroup(artist.id, {
      title: "Our Custom Title",
    });

    await handleTrackGroupPurchase(purchaser.id, trackGroup.id);

    assert.equal(stub.calledTwice, true);
    const data = stub.getCall(1).args[0].data;
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
