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
    assert.equal(data1.template, "album-purchase-artist-notification");
    assert.equal(data1.message.to, artistUser.email);
    const locals1 = data1.locals as AlbumPurchaseArtistNotificationEmailType;
    assert.equal(locals1.trackGroup.id, trackGroup.id);
    assert.equal(locals1.purchase.transaction?.amount, 0);
    assert.equal(locals1.purchase.transaction?.platformCut, 0);
    assert.equal(locals1.purchase.transaction?.stripeCut, 0);
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
    assert.equal(data1.template, "album-purchase-artist-notification");
    assert.equal(data1.message.to, artistUser.email);
    const locals1 = data1.locals as AlbumPurchaseArtistNotificationEmailType;
    assert.equal(locals1.trackGroup.id, trackGroup.id);
    assert.equal(locals1.purchase.transaction?.amount, 0);
  });
});
