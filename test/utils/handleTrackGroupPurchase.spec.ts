import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createTrackGroup, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import sinon from "sinon";
import * as sendMail from "../../src/jobs/send-mail";
import {
  AlbumPurchaseArtistNotificationEmailType,
  AlbumPurchaseEmailType,
  ArtistPurchaseNotificationEmailType,
  handleTrackGroupPurchase,
} from "../../src/utils/handleFinishedTransactions";

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

    const artist = await prisma.artist.create({
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

    const artist = await prisma.artist.create({
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

    const artist = await prisma.artist.create({
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

  it("should increment userFriendlyId per user across multiple purchases", async () => {
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
});
