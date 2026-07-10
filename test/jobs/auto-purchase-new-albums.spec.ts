import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, after } from "mocha";

import { clearTables, createTrackGroup, createUser } from "../utils";

import prisma from "@mirlo/prisma";
import assert from "assert";
import * as sendMailQueue from "../../src/queues/send-mail-queue";
import sinon from "sinon";
import {
  autoPurchaseNewAlbumsProcessor as autoPurchaseNewAlbums,
  AutomaticallyReceivedAlbumEmailType,
  autoPurchaseNewAlbumsQueue,
} from "../../src/queues/auto-purchase-new-albums-queue";
import { triggerAutoPurchaseNewAlbums } from "../../src/jobs/trigger-auto-purchase-new-albums";

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

  after(async () => {
    await sendMailQueue.sendMailQueue.close();
    await sendMailQueue.sendMailQueueEvents.close();
    await autoPurchaseNewAlbumsQueue.close();
  });

  it("should auto purchase a new album", async () => {
    const stub = sinon.stub(sendMailQueue.sendMailQueue, "add");
    stub.resolves(undefined);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const tg = await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      publishedAt: new Date(),
    });

    // Call the job processor with the specific album and subscription
    await autoPurchaseNewAlbums({
      data: {
        trackGroupId: tg.id,
        profileUserSubscriptionId: subscription.id,
      },
    });

    assert.equal(stub.calledOnce, true);
    const data0 = stub.getCall(0).args[1];
    assert.equal(data0.template, "automatically-received-album");
    assert.equal(data0.message.to, "follower@follower.com");
    const locals0 = data0.locals as AutomaticallyReceivedAlbumEmailType;
    assert.equal(locals0.trackGroup.id, tg.id);
    assert.equal(locals0.profile.id, artist.id);
  });

  it("should not send the e-mail twice", async () => {
    const stub = sinon.stub(sendMailQueue.sendMailQueue, "add");
    stub.resolves(undefined);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const tg = await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      publishedAt: new Date(),
    });

    // Call the job processor twice with the same album and subscription
    await autoPurchaseNewAlbums({
      data: {
        trackGroupId: tg.id,
        profileUserSubscriptionId: subscription.id,
      },
    });
    await autoPurchaseNewAlbums({
      data: {
        trackGroupId: tg.id,
        profileUserSubscriptionId: subscription.id,
      },
    });

    // Should only have been called once due to idempotency check
    assert.equal(stub.calledOnce, true);

    const data0 = stub.getCall(0).args[1];
    assert.equal(data0.template, "automatically-received-album");
    assert.equal(data0.message.to, "follower@follower.com");
    const locals0 = data0.locals as AutomaticallyReceivedAlbumEmailType;
    assert.equal(locals0.trackGroup.id, tg.id);
    assert.equal(locals0.profile.id, artist.id);
  });

  it("should skip if album does not exist", async () => {
    const stub = sinon.stub(sendMailQueue.sendMailQueue, "add");
    stub.resolves(undefined);

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: followerUser.id,
        enabled: true,
      },
    });

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: (
          await prisma.profileSubscriptionTier.create({
            data: {
              profileId: artist.id,
              name: "tier",
              autoPurchaseAlbums: true,
            },
          })
        ).id,
        amount: 5,
      },
    });

    // Call with non-existent album
    await autoPurchaseNewAlbums({
      data: {
        trackGroupId: 99999,
        profileUserSubscriptionId: subscription.id,
      },
    });

    // Should not queue email
    assert.equal(stub.calledOnce, false);
  });

  it("should skip if subscription does not exist", async () => {
    const stub = sinon.stub(sendMailQueue.sendMailQueue, "add");
    stub.resolves(undefined);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
      },
    });

    const tg = await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      publishedAt: new Date(),
    });

    // Call with non-existent subscription
    await autoPurchaseNewAlbums({
      data: {
        trackGroupId: tg.id,
        profileUserSubscriptionId: 99999,
      },
    });

    // Should not queue email
    assert.equal(stub.calledOnce, false);
  });

  it("should create purchase record in database", async () => {
    const stub = sinon.stub(sendMailQueue.sendMailQueue, "add");
    stub.resolves(undefined);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const tg = await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      publishedAt: new Date(),
    });

    // Call the job processor
    await autoPurchaseNewAlbums({
      data: {
        trackGroupId: tg.id,
        profileUserSubscriptionId: subscription.id,
      },
    });

    // Verify purchase was created
    const purchase = await prisma.userTrackGroupPurchase.findFirst({
      where: {
        userId: followerUser.id,
        trackGroupId: tg.id,
      },
    });

    assert.ok(purchase);
    assert.equal(purchase.userId, followerUser.id);
    assert.equal(purchase.trackGroupId, tg.id);
  });

  it("should handle multiple subscribers for same album", async () => {
    const stub = sinon.stub(sendMailQueue.sendMailQueue, "add");
    stub.resolves(undefined);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: follower1 } = await createUser({
      email: "follower1@follower.com",
      emailConfirmationToken: null,
    });

    const { user: follower2 } = await createUser({
      email: "follower2@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    const subscription1 = await prisma.profileUserSubscription.create({
      data: {
        userId: follower1.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const subscription2 = await prisma.profileUserSubscription.create({
      data: {
        userId: follower2.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const tg = await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      publishedAt: new Date(),
    });

    // Call for both subscribers
    await autoPurchaseNewAlbums({
      data: {
        trackGroupId: tg.id,
        profileUserSubscriptionId: subscription1.id,
      },
    });
    await autoPurchaseNewAlbums({
      data: {
        trackGroupId: tg.id,
        profileUserSubscriptionId: subscription2.id,
      },
    });

    // Both should have been emailed
    assert.equal(stub.calledTwice, true);

    // Verify both purchases exist
    const purchase1 = await prisma.userTrackGroupPurchase.findFirst({
      where: {
        userId: follower1.id,
        trackGroupId: tg.id,
      },
    });
    const purchase2 = await prisma.userTrackGroupPurchase.findFirst({
      where: {
        userId: follower2.id,
        trackGroupId: tg.id,
      },
    });

    assert.ok(purchase1);
    assert.ok(purchase2);
  });

  it("trigger should find recent albums and enqueue jobs", async () => {
    const addStub = sinon.stub(autoPurchaseNewAlbumsQueue, "add");
    addStub.resolves(undefined);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    // Album released in last hour
    const tg = await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      publishedAt: new Date(),
    });

    // Call trigger
    await triggerAutoPurchaseNewAlbums();

    // Verify job was enqueued
    assert.equal(addStub.calledOnce, true);
    const jobData = addStub.getCall(0).args[1];
    assert.equal(jobData.trackGroupId, tg.id);
    assert.equal(jobData.profileUserSubscriptionId, subscription.id);
  });

  it("trigger should not enqueue for disabled autoPurchase tiers", async () => {
    const addStub = sinon.stub(autoPurchaseNewAlbumsQueue, "add");
    addStub.resolves(undefined);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: artistUser.id,
        enabled: true,
        subscriptionTiers: {
          create: {
            name: "a tier",
            autoPurchaseAlbums: false, // Disabled
          },
        },
      },
      include: {
        subscriptionTiers: true,
      },
    });

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    // Album released in last hour
    const tg = await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      publishedAt: new Date(),
    });

    // Call trigger
    await triggerAutoPurchaseNewAlbums();

    // Verify no jobs were enqueued
    assert.equal(addStub.calledOnce, false);
  });

  it("trigger should enqueue for back-catalog albums published just now", async () => {
    const addStub = sinon.stub(autoPurchaseNewAlbumsQueue, "add");
    addStub.resolves(undefined);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const tg = await createTrackGroup(artist.id, {
      releaseDate: twoYearsAgo,
      publishedAt: new Date(),
    });

    await triggerAutoPurchaseNewAlbums();

    assert.equal(addStub.calledOnce, true);
    const jobData = addStub.getCall(0).args[1];
    assert.equal(jobData.trackGroupId, tg.id);
    assert.equal(jobData.profileUserSubscriptionId, subscription.id);
  });

  it("trigger should not enqueue for albums scheduled to publish in the future", async () => {
    const addStub = sinon.stub(autoPurchaseNewAlbumsQueue, "add");
    addStub.resolves(undefined);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      publishedAt: tomorrow,
    });

    await triggerAutoPurchaseNewAlbums();

    assert.equal(addStub.called, false);
  });

  it("trigger should not enqueue for unpublished albums", async () => {
    const addStub = sinon.stub(autoPurchaseNewAlbumsQueue, "add");
    addStub.resolves(undefined);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      publishedAt: null,
    });

    await triggerAutoPurchaseNewAlbums();

    assert.equal(addStub.called, false);
  });

  it("trigger should not enqueue for albums published more than an hour ago", async () => {
    const addStub = sinon.stub(autoPurchaseNewAlbumsQueue, "add");
    addStub.resolves(undefined);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });

    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      publishedAt: twoHoursAgo,
    });

    await triggerAutoPurchaseNewAlbums();

    assert.equal(addStub.called, false);
  });

  it("trigger should not enqueue for deleted subscriptions", async () => {
    const addStub = sinon.stub(autoPurchaseNewAlbumsQueue, "add");
    addStub.resolves(undefined);

    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
      emailConfirmationToken: null,
    });

    const artist = await prisma.profile.create({
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

    const subscription = await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
        deletedAt: new Date(), // Deleted
      },
    });

    // Album released in last hour
    const tg = await createTrackGroup(artist.id, {
      releaseDate: new Date(),
      publishedAt: new Date(),
    });

    // Call trigger
    await triggerAutoPurchaseNewAlbums();

    // Verify no jobs were enqueued
    assert.equal(addStub.calledOnce, false);
  });
});
