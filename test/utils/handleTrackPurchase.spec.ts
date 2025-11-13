import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createTrack,
  createTrackGroup,
  createUser,
} from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import sinon from "sinon";
import * as sendMail from "../../src/jobs/send-mail";
import {
  ArtistPurchaseNotificationEmailType,
  handleTrackPurchase,
  PurchaseReceiptEmailType,
} from "../../src/utils/handleFinishedTransactions";

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
    assert.equal(data1.message.to, artistUser.email);
    const locals1 = data1.locals as ArtistPurchaseNotificationEmailType;
    assert.equal(
      locals1.transactions[0].trackPurchases?.[0].track.id,
      track.id
    );
    assert.equal(locals1.transactions[0]?.amount, 0);
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
    assert.equal(data1.message.to, artistUser.email);
    const locals1 = data1.locals as ArtistPurchaseNotificationEmailType;
    assert.equal(
      locals1.transactions[0].trackPurchases?.[0].track.id,
      track.id
    );
    assert.equal(locals1.transactions[0]?.amount, 0);
  });
});
