import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import sinon from "sinon";
import * as sendMail from "../../src/jobs/send-mail";
import { handleArtistGift } from "../../src/utils/handleFinishedTransactions";

describe("handleArtistGift", () => {
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

    await handleArtistGift(purchaser.id, artist.id);

    const tip = await prisma.userArtistTip.findFirst({
      where: { userId: purchaser.id, artistId: artist.id },
    });

    assert.equal(stub.calledTwice, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "artist-tip-receipt");
    assert.equal(data0.message.to, "follower@follower.com");
    assert.equal(data0.locals.tip.userId, tip?.userId);
    assert.equal(data0.locals.tip.artistId, tip?.artistId);
    assert.equal(data0.locals.tip.pricePaid, 0);
    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "tip-artist-notification");
    assert.equal(data1.message.to, artistUser.email);
    assert.equal(data1.locals.tip.userId, tip?.userId);
    assert.equal(data1.locals.tip.artistId, tip?.artistId);
    assert.equal(data1.locals.tip.pricePaid, 0);
  });
});
