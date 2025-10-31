import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createTrackGroup, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import * as sendMail from "../../src/jobs/send-mail";
import sinon from "sinon";
import autoPurchaseNewAlbums, {
  AutomaticallyReceivedAlbumEmailType,
} from "../../src/jobs/auto-purchase-new-albums";

describe("auto-purchase-new-albums", () => {
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

  it("should auto purchase a new album", async () => {
    const stub = sinon.stub(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: {
          create: {
            name: "a tier",
            autoPurchaseAlbums: true,
          },
        },
      },
      include: {
        subscriptionTiers: true,
      },
    });

    await prisma.artistUserSubscription.create({
      data: {
        userId: followerUser.id,
        artistSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const tg = await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      published: true,
    });

    await autoPurchaseNewAlbums();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "automatically-received-album");
    assert.equal(data0.message.to, "follower@follower.com");
    const locals0 = data0.locals as AutomaticallyReceivedAlbumEmailType;
    assert.equal(locals0.trackGroup.id, tg.id);
    assert.equal(locals0.artist.id, artist.id);
  });

  it("should not send the e-mail twice", async () => {
    const stub = sinon.stub(sendMail, "default");

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: {
          create: {
            name: "a tier",
            autoPurchaseAlbums: true,
          },
        },
      },
      include: {
        subscriptionTiers: true,
      },
    });

    await prisma.artistUserSubscription.create({
      data: {
        userId: followerUser.id,
        artistSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const tg = await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      published: true,
    });

    await autoPurchaseNewAlbums();
    await autoPurchaseNewAlbums();

    assert.equal(stub.calledOnce, true);

    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "automatically-received-album");
    assert.equal(data0.message.to, "follower@follower.com");
    const locals0 = data0.locals as AutomaticallyReceivedAlbumEmailType;
    assert.equal(locals0.trackGroup.id, tg.id);
    assert.equal(locals0.artist.id, artist.id);
  });
});
