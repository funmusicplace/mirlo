import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, after } from "mocha";
import sinon from "sinon";

import { triggerTrackGroupPublishNotifications } from "../../src/jobs/trigger-trackgroup-publish-notifications";
import * as sendMailQueue from "../../src/queues/send-mail-queue";
import {
  AutomaticallyReceivedAlbumEmailType,
  grantReleaseToAutoPurchaseTiers,
} from "../../src/utils/trackGroup";
import { clearTables, createTrackGroup, createUser } from "../utils";

import prisma from "@mirlo/prisma";

import assert from "assert";

const setupArtistWithSubscriber = async (autoPurchaseAlbums = true) => {
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
        create: { name: "a tier", autoPurchaseAlbums },
      },
    },
    include: { subscriptionTiers: true },
  });

  const subscription = await prisma.profileUserSubscription.create({
    data: {
      userId: followerUser.id,
      profileSubscriptionTierId: artist.subscriptionTiers[0].id,
      amount: 5,
    },
  });

  return { artist, followerUser, subscription };
};

const findPurchase = (userId: number, trackGroupId: number) =>
  prisma.userTrackGroupPurchase.findFirst({ where: { userId, trackGroupId } });

describe("auto-purchase-new-albums", () => {
  let mailStub: sinon.SinonStub;

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
    mailStub = sinon.stub(sendMailQueue.sendMailQueue, "add");
    mailStub.resolves(undefined);
  });

  afterEach(() => {
    sinon.restore();
  });

  after(async () => {
    await sendMailQueue.sendMailQueue.close();
    await sendMailQueue.sendMailQueueEvents.close();
  });

  it("should auto purchase a new album and email the subscriber", async () => {
    const { artist, followerUser } = await setupArtistWithSubscriber();
    const tg = await createTrackGroup(artist.id);

    await grantReleaseToAutoPurchaseTiers(tg.id);

    const purchase = await findPurchase(followerUser.id, tg.id);
    assert.equal(purchase?.proGratis, true);

    assert.equal(mailStub.calledOnce, true);
    const data0 = mailStub.getCall(0).args[1];
    assert.equal(data0.template, "automatically-received-album");
    assert.equal(data0.message.to, "follower@follower.com");
    const locals0 = data0.locals as AutomaticallyReceivedAlbumEmailType;
    assert.equal(locals0.trackGroup.id, tg.id);
    assert.equal(locals0.trackGroup.urlSlug, tg.urlSlug);
    assert.equal(locals0.trackGroup.artist.urlSlug, artist.urlSlug);
    assert.equal(locals0.artist.id, artist.id);
  });

  it("should not send the e-mail twice", async () => {
    const { artist } = await setupArtistWithSubscriber();
    const tg = await createTrackGroup(artist.id);

    await grantReleaseToAutoPurchaseTiers(tg.id);
    await grantReleaseToAutoPurchaseTiers(tg.id);

    assert.equal(mailStub.calledOnce, true);
  });

  it("should handle multiple subscribers for same album", async () => {
    const { artist, followerUser } = await setupArtistWithSubscriber();
    const { user: secondUser } = await createUser({
      email: "second@follower.com",
    });
    await prisma.profileUserSubscription.create({
      data: {
        userId: secondUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });
    const tg = await createTrackGroup(artist.id);

    await grantReleaseToAutoPurchaseTiers(tg.id);

    assert.ok(await findPurchase(followerUser.id, tg.id));
    assert.ok(await findPurchase(secondUser.id, tg.id));
    assert.equal(mailStub.calledTwice, true);
  });

  it("should grant albums published more than an hour ago once they're finalized", async () => {
    const { artist, followerUser } = await setupArtistWithSubscriber();
    const tg = await createTrackGroup(artist.id, {
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      isPublic: true,
    });

    await triggerTrackGroupPublishNotifications();

    assert.ok(await findPurchase(followerUser.id, tg.id));
  });

  it("should not grant for disabled autoPurchase tiers", async () => {
    const { artist, followerUser } = await setupArtistWithSubscriber(false);
    const tg = await createTrackGroup(artist.id);

    await grantReleaseToAutoPurchaseTiers(tg.id);

    assert.equal(await findPurchase(followerUser.id, tg.id), null);
    assert.equal(mailStub.called, false);
  });

  it("should not grant for deleted subscriptions", async () => {
    const { artist, followerUser, subscription } =
      await setupArtistWithSubscriber();
    await prisma.profileUserSubscription.update({
      where: { id: subscription.id },
      data: { deletedAt: new Date() },
    });
    const tg = await createTrackGroup(artist.id);

    await grantReleaseToAutoPurchaseTiers(tg.id);

    assert.equal(await findPurchase(followerUser.id, tg.id), null);
  });

  const ineligible: [string, () => Parameters<typeof createTrackGroup>[1]][] = [
    [
      "scheduled in the future",
      () => ({ publishedAt: new Date(Date.now() + 60_000) }),
    ],
    ["unpublished", () => ({ publishedAt: null })],
    ["private", () => ({ isPublic: false })],
    [
      "without a cover",
      () => ({ cover: { create: { url: [], dimensions: "artwork" } } }),
    ],
    [
      "the hidden song-drafts album",
      () => ({ isHiddenTrackGroupForSongDrafts: true }),
    ],
    ["admin-disabled", () => ({ adminEnabled: false })],
  ];

  for (const [label, makeData] of ineligible) {
    it(`should not grant albums that are ${label}`, async () => {
      const { artist, followerUser } = await setupArtistWithSubscriber();
      const tg = await createTrackGroup(artist.id, makeData());

      await grantReleaseToAutoPurchaseTiers(tg.id);

      assert.equal(await findPurchase(followerUser.id, tg.id), null);
    });
  }
});
