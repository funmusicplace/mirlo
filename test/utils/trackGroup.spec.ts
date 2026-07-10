import assert from "node:assert";

import prisma from "@mirlo/prisma";

import {
  finalizeTrackGroupPublication,
  findTrackGroupIdForSlug,
} from "../../src/utils/trackGroup";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../utils";

describe("findTrackGroupIdForSlug", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should find a trackgroup by id", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, {
      urlSlug: "test-slug",
    });

    const id = await findTrackGroupIdForSlug(`${trackGroup.id}`);

    assert.equal(id, trackGroup.id);
  });

  it("should find a trackgroup by slug", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, {
      urlSlug: "test-slug",
    });

    const id = await findTrackGroupIdForSlug(
      trackGroup.urlSlug,
      `${artist.id}`
    );

    assert.equal(id, trackGroup.id);
  });

  it("should complain about missing profileId", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, {
      urlSlug: "test-slug",
    });
    let id;
    try {
      id = await findTrackGroupIdForSlug(trackGroup.urlSlug);
    } catch (e) {
      assert.equal(
        (e as any).message,
        "Searching for a TrackGroup by slug requires an profileId"
      );
    }
    assert.equal(id, undefined);
  });

  it("should handle a urlSlug that is a number if an profileId is defined", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, {
      urlSlug: "2121",
    });
    const id = await findTrackGroupIdForSlug(
      trackGroup.urlSlug,
      `${artist.id}`
    );

    assert.equal(id, trackGroup.id);
  });
});

describe("finalizeTrackGroupPublication", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  const setupArtistWithFollower = async () => {
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
        subscriptionTiers: { create: { name: "a tier" } },
      },
      include: { subscriptionTiers: true },
    });
    await prisma.profileUserSubscription.create({
      data: {
        userId: followerUser.id,
        profileSubscriptionTierId: artist.subscriptionTiers[0].id,
        amount: 5,
      },
    });
    return { artist, followerUser };
  };

  it("sets publishedAt and backfills releaseDate to publishedAt when releaseDate is null (publish-now path)", async () => {
    const { artist } = await setupArtistWithFollower();
    const tg = await createTrackGroup(artist.id, {
      publishedAt: null,
      releaseDate: null,
      isPublic: true,
    });

    const now = new Date();
    const updated = await finalizeTrackGroupPublication(tg, now);

    assert.deepEqual(updated.publishedAt, now);
    assert.deepEqual(updated.releaseDate, now);
  });

  it("preserves an existing releaseDate when set", async () => {
    const { artist } = await setupArtistWithFollower();
    const releaseDate = new Date("2020-06-01");
    const tg = await createTrackGroup(artist.id, {
      publishedAt: null,
      releaseDate,
      isPublic: true,
    });

    const now = new Date();
    const updated = await finalizeTrackGroupPublication(tg, now);

    assert.deepEqual(updated.publishedAt, now);
    assert.deepEqual(updated.releaseDate, releaseDate);
  });

  it("notifies followers exactly once even when called twice", async () => {
    const { artist, followerUser } = await setupArtistWithFollower();
    const tg = await createTrackGroup(artist.id, {
      publishedAt: null,
      isPublic: true,
    });

    const now = new Date();
    await finalizeTrackGroupPublication(tg, now);
    const refreshed = await prisma.trackGroup.findUniqueOrThrow({
      where: { id: tg.id },
    });
    await finalizeTrackGroupPublication(refreshed, now);

    const notifications = await prisma.notification.findMany({
      where: { trackGroupId: tg.id, userId: followerUser.id },
    });
    assert.equal(notifications.length, 1);
  });

  it("does not notify followers when the trackgroup is private", async () => {
    const { artist, followerUser } = await setupArtistWithFollower();
    const tg = await createTrackGroup(artist.id, {
      publishedAt: null,
      isPublic: false,
    });

    await finalizeTrackGroupPublication(tg, new Date());

    const notifications = await prisma.notification.findMany({
      where: { trackGroupId: tg.id, userId: followerUser.id },
    });
    assert.equal(notifications.length, 0);
  });

  it("skips the prisma write when publishedAt and releaseDate are already correct", async () => {
    const { artist } = await setupArtistWithFollower();
    const publishedAt = new Date(Date.now() - 60 * 1000);
    const tg = await createTrackGroup(artist.id, {
      publishedAt,
      releaseDate: publishedAt,
      isPublic: false,
    });
    const updatedAtBefore = (
      await prisma.trackGroup.findUniqueOrThrow({ where: { id: tg.id } })
    ).updatedAt;

    await finalizeTrackGroupPublication(tg, publishedAt);

    const updatedAtAfter = (
      await prisma.trackGroup.findUniqueOrThrow({ where: { id: tg.id } })
    ).updatedAt;
    assert.deepEqual(updatedAtAfter, updatedAtBefore);
  });
});
