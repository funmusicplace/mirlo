import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "../../prisma/prisma";

import { clearTables, createArtist, createUser } from "../utils";
import cleanUpTrackGroups from "../../src/jobs/clean-up-trackgroups";
import assert from "node:assert";

describe("clean-up-trackgroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should run with no trackGroups found", async () => {
    await cleanUpTrackGroups();
  });

  it("should remove trackGroups deleted 6 months ago", async () => {
    const today = new Date();
    const sevenMonthsAgo = today.setMonth(today.getMonth() - 7);

    const { user } = await createUser({
      email: "test@test.com",
    });

    const artist = await createArtist(user.id);
    const trackGroup = await prisma.trackGroup.create({
      data: {
        artistId: artist.id,
        urlSlug: "test-album",
        title: "Test album",
        published: true,
        deletedAt: new Date(sevenMonthsAgo),
      },
    });

    await cleanUpTrackGroups();
    const found =
      await prisma.$executeRaw`SELECT * FROM "TrackGroup" where id = ${trackGroup.id}`;
    assert.equal(found, 1);
  });

  it("should not remove trackGroups deleted in the last 6 months ago", async () => {
    const today = new Date();
    const fourMonthsAgo = today.setMonth(today.getMonth() - 4);

    const { user } = await createUser({
      email: "test@test.com",
    });

    const artist = await createArtist(user.id);
    const trackGroup = await prisma.trackGroup.create({
      data: {
        artistId: artist.id,
        urlSlug: "test-album",
        title: "Test album",
        published: true,
        deletedAt: new Date(fourMonthsAgo),
      },
    });

    await cleanUpTrackGroups();
    const found =
      await prisma.$executeRaw`SELECT * FROM "TrackGroup" where id = ${trackGroup.id}`;
    assert.equal(found, 1);
  });

  it("should remove associated items from TrackGroup", async () => {
    const today = new Date();
    const sevenMonthsAgo = today.setMonth(today.getMonth() - 7);

    const { user } = await createUser({
      email: "test@test.com",
    });

    const artist = await createArtist(user.id);
    const trackGroup = await prisma.trackGroup.create({
      data: {
        artistId: artist.id,
        urlSlug: "test-album",
        title: "Test album",
        published: true,
        deletedAt: new Date(sevenMonthsAgo),
      },
    });

    await prisma.track.create({
      data: {
        trackGroupId: trackGroup.id,
        order: 0,
      },
    });

    await prisma.track.create({
      data: {
        trackGroupId: trackGroup.id,
        order: 1,
      },
    });

    await cleanUpTrackGroups();
    const found =
      await prisma.$executeRaw`SELECT * FROM "TrackGroup" where id = ${trackGroup.id}`;
    assert.equal(found, 1);

    const foundTracks =
      await prisma.$executeRaw`SELECT * FROM "Track" where "trackGroupId" = ${trackGroup.id}`;

    assert.equal(foundTracks, 0);
  });
});
