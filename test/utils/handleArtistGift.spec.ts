import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import sinon from "sinon";
import * as sendMail from "../../src/jobs/send-mail";
import {
  ArtistPurchaseNotificationEmailType,
  handleArtistGift,
  PurchaseReceiptEmailType,
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
    assert.equal(data0.template, "purchase-receipt");
    assert.equal(data0.message.to, "follower@follower.com");
    const locals = data0.locals as PurchaseReceiptEmailType;
    assert.equal(locals.transactions[0].userId, tip?.userId);
    assert.equal(locals.transactions[0].tips?.[0].artist.id, tip?.artistId);
    assert.equal(locals.transactions[0].amount, 0);
    const data1 = stub.getCall(1).args[0].data;
    assert.equal(data1.template, "artist-purchase-notification");
    assert.equal(data1.message.to, artistUser.email);
    const locals1 = data1.locals as ArtistPurchaseNotificationEmailType;
    assert.equal(locals1.transactions[0].userId, tip?.userId);
    assert.equal(locals1.transactions[0].tips?.[0].artist.id, tip?.artistId);
    assert.equal(locals1.transactions[0].amount, 0);
  });
});
