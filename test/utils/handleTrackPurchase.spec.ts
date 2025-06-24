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
import { handleTrackPurchase } from "../../src/utils/handleFinishedTransactions";

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
    assert.equal(data0.template, "track-purchase-receipt");
    assert.equal(data0.message.to, "follower@follower.com");
    assert.equal(data0.locals.track.id, track.id);
    assert.equal(data0.locals.purchase.pricePaid, 0);
    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "track-purchase-artist-notification");
    assert.equal(data1.message.to, artistUser.email);
    assert.equal(data1.locals.track.id, track.id);
    assert.equal(data1.locals.purchase.pricePaid, 0);
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

    await handleTrackPurchase(purchaser.id, track.id, undefined, true);

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "track-download");
    assert.equal(data0.message.to, "follower@follower.com");
    assert.equal(data0.locals.track.id, track.id);
    assert.equal(data0.locals.purchase.pricePaid, 0);
    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "track-purchase-artist-notification");
    assert.equal(data1.message.to, artistUser.email);
    assert.equal(data1.locals.track.id, track.id);
    assert.equal(data1.locals.purchase.pricePaid, 0);
  });
});
