import * as dotenv from "dotenv";

dotenv.config();
import assert from "assert";

import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import { triggerTrackGroupPublishNotifications } from "../../src/jobs/trigger-trackgroup-publish-notifications";
import { clearTables, createTrackGroup, createUser } from "../utils";

const setupArtistWithFollower = async (overrides?: {
  artistEnabled?: boolean;
}) => {
  const { user: artistUser } = await createUser({ email: "artist@artist.com" });
  const { user: followerUser } = await createUser({
    email: "follower@follower.com",
    emailConfirmationToken: null,
  });

  const artist = await prisma.artist.create({
    data: {
      name: "Test artist",
      urlSlug: "test-artist",
      userId: artistUser.id,
      enabled: overrides?.artistEnabled ?? true,
      subscriptionTiers: { create: { name: "a tier" } },
    },
    include: { subscriptionTiers: true },
  });

  await prisma.artistUserSubscription.create({
    data: {
      userId: followerUser.id,
      artistSubscriptionTierId: artist.subscriptionTiers[0].id,
      amount: 5,
    },
  });

  return { artist, followerUser };
};

describe("trigger-trackgroup-publish-notifications", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("notifies followers when a public scheduled trackGroup's publishedAt has passed", async () => {
    const { artist, followerUser } = await setupArtistWithFollower();

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const tg = await createTrackGroup(artist.id, {
      publishedAt: oneMinuteAgo,
      releaseDate: null,
      isPublic: true,
    });

    await triggerTrackGroupPublishNotifications();

    const notifications = await prisma.notification.findMany({
      where: { trackGroupId: tg.id, userId: followerUser.id },
    });
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].notificationType, "NEW_ARTIST_ALBUM");

    const updated = await prisma.trackGroup.findFirst({ where: { id: tg.id } });
    assert.ok(updated?.notifiedFollowersAt);
    assert.deepEqual(updated?.releaseDate, oneMinuteAgo);
  });

  it("is idempotent: a second run does not create duplicate notifications", async () => {
    const { artist, followerUser } = await setupArtistWithFollower();

    const tg = await createTrackGroup(artist.id, {
      publishedAt: new Date(Date.now() - 60 * 1000),
      isPublic: true,
    });

    await triggerTrackGroupPublishNotifications();
    await triggerTrackGroupPublishNotifications();

    const notifications = await prisma.notification.findMany({
      where: { trackGroupId: tg.id, userId: followerUser.id },
    });
    assert.equal(notifications.length, 1);
  });

  it("skips trackGroups whose publishedAt is in the future", async () => {
    const { artist, followerUser } = await setupArtistWithFollower();

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tg = await createTrackGroup(artist.id, {
      publishedAt: tomorrow,
      isPublic: true,
    });

    await triggerTrackGroupPublishNotifications();

    const notifications = await prisma.notification.findMany({
      where: { trackGroupId: tg.id, userId: followerUser.id },
    });
    assert.equal(notifications.length, 0);

    const updated = await prisma.trackGroup.findFirst({ where: { id: tg.id } });
    assert.equal(updated?.notifiedFollowersAt, null);
  });

  it("skips private scheduled trackGroups (notification waits for the public flip)", async () => {
    const { artist, followerUser } = await setupArtistWithFollower();

    const tg = await createTrackGroup(artist.id, {
      publishedAt: new Date(Date.now() - 60 * 1000),
      isPublic: false,
    });

    await triggerTrackGroupPublishNotifications();

    const notifications = await prisma.notification.findMany({
      where: { trackGroupId: tg.id, userId: followerUser.id },
    });
    assert.equal(notifications.length, 0);

    const updated = await prisma.trackGroup.findFirst({ where: { id: tg.id } });
    assert.equal(updated?.notifiedFollowersAt, null);
  });

  it("skips trackGroups with no publishedAt", async () => {
    const { artist, followerUser } = await setupArtistWithFollower();

    const tg = await createTrackGroup(artist.id, {
      publishedAt: null,
      isPublic: true,
    });

    await triggerTrackGroupPublishNotifications();

    const notifications = await prisma.notification.findMany({
      where: { trackGroupId: tg.id, userId: followerUser.id },
    });
    assert.equal(notifications.length, 0);
  });

  it("preserves existing releaseDate instead of overwriting with publishedAt", async () => {
    const { artist } = await setupArtistWithFollower();

    const releaseDate = new Date("2020-01-01");
    const tg = await createTrackGroup(artist.id, {
      publishedAt: new Date(Date.now() - 60 * 1000),
      releaseDate,
      isPublic: true,
    });

    await triggerTrackGroupPublishNotifications();

    const updated = await prisma.trackGroup.findFirst({ where: { id: tg.id } });
    assert.deepEqual(updated?.releaseDate, releaseDate);
  });
});
