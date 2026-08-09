import * as dotenv from "dotenv";
dotenv.config();

import prisma from "@mirlo/prisma";

import assert from "assert";

import { describe, it } from "mocha";
import sinon from "sinon";

import * as sendMail from "../../src/jobs/send-mail";
import {
  ArtistPurchaseNotificationEmailType,
  handleTrackPurchase,
  PurchaseReceiptEmailType,
} from "../../src/utils/handleFinishedTransactions";
import {
  clearTables,
  createProfile,
  createTrack,
  createTrackGroup,
  createUser,
  fakePayment,
} from "../utils";

describe("handleTrackPurchase", () => {
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

  it("should send out emails for track purchase", async () => {
    const stub = sinon.spy(sendMail, "default");

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

    const track = await createTrack(trackGroup.id);

    await handleTrackPurchase(purchaser.id, track.id);

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "purchase-receipt");
    assert.equal(data0.message.to, "follower@follower.com");
    const locals = data0.locals as PurchaseReceiptEmailType;
    assert.equal(locals.transactions[0].trackPurchases?.[0].track.id, track.id);
    assert.equal(locals.transactions[0]?.amount, 0);
    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "artist-purchase-notification");
    assert.equal(data1.message.to, profileOwner.email);
    const locals1 = data1.locals as ArtistPurchaseNotificationEmailType;
    assert.equal(
      locals1.transactions[0].trackPurchases?.[0].track.id,
      track.id
    );
    assert.equal(locals1.transactions[0]?.amount, 0);
  });

  it("should send out emails for track group purchase without log-in", async () => {
    const stub = sinon.spy(sendMail, "default");

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

    const track = await createTrack(trackGroup.id);

    await handleTrackPurchase(purchaser.id, track.id, undefined);

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "purchase-receipt");
    assert.equal(data0.message.to, "follower@follower.com");
    const locals0 = data0.locals as PurchaseReceiptEmailType;
    assert.equal(
      locals0.transactions[0].trackPurchases?.[0].track.id,
      track.id
    );
    assert.equal(locals0.transactions[0]?.amount, 0);
    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "artist-purchase-notification");
    assert.equal(data1.message.to, profileOwner.email);
    const locals1 = data1.locals as ArtistPurchaseNotificationEmailType;
    assert.equal(
      locals1.transactions[0].trackPurchases?.[0].track.id,
      track.id
    );
    assert.equal(locals1.transactions[0]?.amount, 0);
  });

  it("sends the artist notification to the release's paymentToUser, cc'ing their accounting email", async () => {
    const stub = sinon.spy(sendMail, "default");

    const { user: profileOwner } = await createUser({
      email: "artist@artist.com",
    });
    const { user: label } = await createUser({
      email: "label@label.com",
      accountingEmail: "accounts@label.com",
    });
    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const profile = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: profileOwner.id,
        enabled: true,
      },
    });
    const trackGroup = await createTrackGroup(profile.id);
    await prisma.trackGroup.update({
      where: { id: trackGroup.id },
      data: { paymentToUserId: label.id },
    });
    const track = await createTrack(trackGroup.id);

    await handleTrackPurchase(purchaser.id, track.id);

    const notification = stub
      .getCalls()
      .find(
        (call) => call.args[0].data.template === "artist-purchase-notification"
      );
    assert.ok(notification, "should send the artist notification");
    assert.equal(notification!.args[0].data.message.to, "label@label.com");
    assert.equal(notification!.args[0].data.message.cc, "accounts@label.com");
  });

  it("records the processing fee on the transaction", async () => {
    sinon.stub(sendMail, "default").resolves();

    const { user: profileOwner } = await createUser({
      email: "artist@artist.com",
    });
    const { user: purchaser } = await createUser({
      email: "follower@follower.com",
    });
    const profile = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: profileOwner.id,
        enabled: true,
      },
    });
    const trackGroup = await createTrackGroup(profile.id);
    const track = await createTrack(trackGroup.id);

    await handleTrackPurchase(
      purchaser.id,
      track.id,
      fakePayment({ amount: 500, platformCut: 50, processorFee: 30 })
    );

    const purchase = await prisma.userTrackPurchase.findFirst({
      where: { userId: purchaser.id, trackId: track.id },
      include: { transaction: true },
    });
    assert.equal(purchase?.transaction?.amount, 500);
    assert.equal(purchase?.transaction?.platformCut, 50);
    assert.equal(
      purchase?.transaction?.stripeCut,
      30,
      "track purchases used to drop the processing fee"
    );
  });
});
