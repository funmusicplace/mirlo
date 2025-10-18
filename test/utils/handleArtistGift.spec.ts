import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import sinon from "sinon";
import * as sendMail from "../../src/jobs/send-mail";
import {
  ArtistTipNotificationEmailType,
  ArtistTipReceiptEmailType,
  handleArtistGift,
} from "../../src/utils/handleFinishedTransactions";

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

  it("should send out emails for artist gift", async () => {
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
    const locals = data0.locals as ArtistTipReceiptEmailType;
    assert.equal(locals.tip.userId, tip?.userId);
    assert.equal(locals.tip.artistId, tip?.artistId);
    assert.equal(locals.tip.pricePaid, 0);
    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "tip-artist-notification");
    assert.equal(data1.message.to, artistUser.email);
    const locals1 = data1.locals as ArtistTipNotificationEmailType;
    assert.equal(locals1.tip.userId, tip?.userId);
    assert.equal(locals1.tip.artistId, tip?.artistId);
    assert.equal(locals1.tip.pricePaid, 0);
  });
});
