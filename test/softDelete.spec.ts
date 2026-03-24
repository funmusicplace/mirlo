import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import {
  clearTables,
  createArtist,
  createUser,
  createTrackGroup,
} from "./utils";

describe("Soft Delete Extension (deletedAt)", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("Artists", () => {
    it("should soft delete an artist instead of permanently deleting", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const artistId = artist.id;

      // Verify artist exists
      const foundBefore = await prisma.artist.findFirst({
        where: { id: artistId },
      });
      assert.ok(foundBefore, "Artist should exist before delete");
      assert.strictEqual(
        foundBefore.deletedAt,
        null,
        "Artist should not be soft deleted"
      );

      // Delete the artist via Prisma
      await prisma.artist.delete({
        where: { id: artistId },
      });

      // Verify artist is not returned by normal find (soft delete filter)
      const foundAfter = await prisma.artist.findFirst({
        where: { id: artistId },
      });
      assert.strictEqual(
        foundAfter,
        null,
        "Artist should not be found by normal query (filtered by deletedAt)"
      );

      // Verify deletedAt is set in raw query (bypassing soft delete filter)
      const rawArtist = await prisma.$queryRaw<
        Array<{ deletedAt: Date | null }>
      >`
        SELECT "deletedAt" FROM "Artist" WHERE id = ${artistId}
      `;
      assert.ok(rawArtist[0], "Artist should still exist in database");
      assert.ok(rawArtist[0].deletedAt, "Artist should have deletedAt set");
      assert.ok(
        rawArtist[0].deletedAt instanceof Date,
        "deletedAt should be a Date"
      );
    });

    it("should not return soft-deleted artists in list queries", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const artist1 = await createArtist(user.id, { name: "Artist 1" });
      const artist2 = await createArtist(user.id, { name: "Artist 2" });

      // Verify both artists exist
      let allArtists = await prisma.artist.findMany();
      assert.equal(allArtists.length, 2, "Should have 2 artists before delete");

      // Soft delete artist1
      await prisma.artist.delete({
        where: { id: artist1.id },
      });

      // Verify only artist2 is returned
      allArtists = await prisma.artist.findMany();
      assert.equal(allArtists.length, 1, "Should have 1 artist after delete");
      assert.equal(
        allArtists[0].id,
        artist2.id,
        "Remaining artist should be artist2"
      );
    });

    it("should not return soft-deleted artists in findFirst with slug", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);

      // Soft delete the artist
      await prisma.artist.delete({
        where: { id: artist.id },
      });

      // Verify artist is not found via slug query
      const foundArtist = await prisma.artist.findFirst({
        where: { urlSlug: artist.urlSlug },
      });
      assert.strictEqual(
        foundArtist,
        null,
        "Soft-deleted artist should not be found by slug"
      );
    });
  });

  describe("TrackGroups", () => {
    it("should soft delete a trackgroup instead of permanently deleting", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const trackGroupId = trackGroup.id;

      // Verify trackgroup exists
      const foundBefore = await prisma.trackGroup.findFirst({
        where: { id: trackGroupId },
      });
      assert.ok(foundBefore, "TrackGroup should exist before delete");
      assert.strictEqual(
        foundBefore.deletedAt,
        null,
        "TrackGroup should not be soft deleted"
      );

      // Delete the trackgroup via Prisma
      await prisma.trackGroup.delete({
        where: { id: trackGroupId },
      });

      // Verify trackgroup is not returned by normal find (soft delete filter)
      const foundAfter = await prisma.trackGroup.findFirst({
        where: { id: trackGroupId },
      });
      assert.strictEqual(
        foundAfter,
        null,
        "TrackGroup should not be found by normal query (filtered by deletedAt)"
      );

      // Verify deletedAt is set in raw query (bypassing soft delete filter)
      const rawTrackGroup = await prisma.$queryRaw<
        Array<{ deletedAt: Date | null }>
      >`
        SELECT "deletedAt" FROM "TrackGroup" WHERE id = ${trackGroupId}
      `;
      assert.ok(rawTrackGroup[0], "TrackGroup should still exist in database");
      assert.ok(
        rawTrackGroup[0].deletedAt,
        "TrackGroup should have deletedAt set"
      );
      assert.ok(
        rawTrackGroup[0].deletedAt instanceof Date,
        "deletedAt should be a Date"
      );
    });

    it("should not return soft-deleted trackgroups in list queries", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup1 = await createTrackGroup(artist.id, {
        title: "Album 1",
        urlSlug: "album-1",
      });
      const trackGroup2 = await createTrackGroup(artist.id, {
        title: "Album 2",
        urlSlug: "album-2",
      });

      // Verify both trackgroups exist
      let allTrackGroups = await prisma.trackGroup.findMany({
        where: { artistId: artist.id },
      });
      assert.equal(
        allTrackGroups.length,
        2,
        "Should have 2 trackgroups before delete"
      );

      // Soft delete trackGroup1 via raw SQL (simulating delete endpoint)
      await prisma.trackGroup.delete({
        where: { id: trackGroup1.id },
      });

      // Verify only trackGroup2 is returned
      allTrackGroups = await prisma.trackGroup.findMany({
        where: { artistId: artist.id },
      });
      assert.equal(
        allTrackGroups.length,
        1,
        "Should have 1 trackgroup after delete"
      );
      assert.equal(
        allTrackGroups[0].id,
        trackGroup2.id,
        "Remaining trackgroup should be trackGroup2"
      );
    });
  });

  describe("DeleteMany with soft deletes", () => {
    it("should soft delete multiple trackgroups via deleteMany", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup1 = await createTrackGroup(artist.id, {
        title: "Album 1",
        urlSlug: "album-1",
      });
      const trackGroup2 = await createTrackGroup(artist.id, {
        title: "Album 2",
        urlSlug: "album-2",
      });
      const trackGroup3 = await createTrackGroup(artist.id, {
        title: "Album 3",
        urlSlug: "album-3",
      });

      // Delete multiple trackgroups
      await prisma.trackGroup.deleteMany({
        where: {
          artistId: artist.id,
          id: { in: [trackGroup1.id, trackGroup2.id] },
        },
      });

      // Verify only trackGroup3 is returned
      const remaining = await prisma.trackGroup.findMany({
        where: { artistId: artist.id },
      });
      assert.equal(remaining.length, 1, "Should have 1 trackgroup remaining");
      assert.equal(
        remaining[0].id,
        trackGroup3.id,
        "Remaining should be trackGroup3"
      );

      // Verify deletedAt is set for deleted trackgroups
      const deletedTrackGroups = await prisma.$queryRaw<
        Array<{ id: number; deletedAt: Date | null }>
      >`
        SELECT id, "deletedAt" FROM "TrackGroup" 
        WHERE id IN (${trackGroup1.id}, ${trackGroup2.id})
      `;
      assert.equal(
        deletedTrackGroups.length,
        2,
        "Both deleted trackgroups should still exist"
      );
      deletedTrackGroups.forEach((tg) => {
        assert.ok(
          tg.deletedAt,
          `TrackGroup ${tg.id} should have deletedAt set`
        );
      });
    });

    it("should soft delete multiple artists via deleteMany", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const artist1 = await createArtist(user.id, { name: "Artist 1" });
      const artist2 = await createArtist(user.id, { name: "Artist 2" });
      const artist3 = await createArtist(user.id, { name: "Artist 3" });

      // Query before delete
      let allArtists = await prisma.artist.findMany();
      assert.equal(allArtists.length, 3);

      // Delete multiple artists
      await prisma.artist.deleteMany({
        where: { id: { in: [artist1.id, artist2.id] } },
      });

      // Verify only artist3 is returned
      allArtists = await prisma.artist.findMany();
      assert.equal(allArtists.length, 1, "Should have 1 artist remaining");
      assert.equal(allArtists[0].id, artist3.id, "Remaining should be artist3");

      // Verify deletedAt is set for deleted artists
      const deletedArtists = await prisma.$queryRaw<
        Array<{ id: number; deletedAt: Date | null }>
      >`
        SELECT id, "deletedAt" FROM "Artist" 
        WHERE id IN (${artist1.id}, ${artist2.id})
      `;
      assert.equal(
        deletedArtists.length,
        2,
        "Both deleted artists should still exist"
      );
      deletedArtists.forEach((a) => {
        assert.ok(a.deletedAt, `Artist ${a.id} should have deletedAt set`);
      });
    });
  });
});
