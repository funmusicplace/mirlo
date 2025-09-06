import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createPost, createUser } from "../utils";

import sendOutMonthlyReceipts from "../../src/jobs/send-out-monthly-receipts";
import prisma from "@mirlo/prisma";
import assert from "assert";
import * as sendMail from "../../src/jobs/send-mail";
import sinon from "sinon";

describe("send-out-monthly-receipts", () => {
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

  it("should send out monthly receipt", async () => {
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

    await sendOutMonthlyReceipts();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "announce-monthly-receipts");
    assert.equal(data0.message.to, "follower@follower.com");
    assert.equal(data0.locals.userSubscriptions.length, 1);
    assert.equal(data0.locals.user.email, followerUser.email);
  });

  it("should not send out monthly receipt if amount is 0", async () => {
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
        amount: 0,
      },
    });

    await sendOutMonthlyReceipts();

    assert.equal(stub.calledOnce, false);
  });

  it("should send out monthly receipt if some are greater than 0", async () => {
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
          },
        },
      },
      include: {
        subscriptionTiers: true,
      },
    });

    const artist2 = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: {
          create: {
            name: "a tier",
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
        artistSubscriptionTierId: artist2.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    await prisma.artistUserSubscription.create({
      data: {
        userId: followerUser.id,
        artistSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 0,
      },
    });

    await sendOutMonthlyReceipts();

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[0].data;
    assert.equal(data0.template, "announce-monthly-receipts");
    assert.equal(data0.message.to, "follower@follower.com");
    assert.equal(data0.locals.userSubscriptions[0].amount, 5);
    assert.equal(
      data0.locals.userSubscriptions[0].artistSubscriptionTier.artistId,
      artist2.id
    );
    assert.equal(data0.locals.userSubscriptions.length, 1);
    assert.equal(data0.locals.user.email, followerUser.email);
  });
});
