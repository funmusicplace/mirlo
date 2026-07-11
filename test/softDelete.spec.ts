import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import {
  clearTables,
  createProfile,
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
      const profile = await createProfile(user.id);
      const profileId = profile.id;

      // Verify artist exists
      const foundBefore = await prisma.profile.findFirst({
        where: { id: profileId },
      });
      assert.ok(foundBefore, "Artist should exist before delete");
      assert.strictEqual(
        foundBefore.deletedAt,
        null,
        "Artist should not be soft deleted"
      );

      // Delete the artist via Prisma
      await prisma.profile.delete({
        where: { id: profileId },
      });

      // Verify artist is not returned by normal find (soft delete filter)
      const foundAfter = await prisma.profile.findFirst({
        where: { id: profileId },
      });
      assert.strictEqual(
        foundAfter,
        null,
        "Artist should not be found by normal query (filtered by deletedAt)"
      );

      // Verify deletedAt is set in raw query (bypassing soft delete filter)
      const rawProfile = await prisma.$queryRaw<
        Array<{ deletedAt: Date | null }>
      >`
        SELECT "deletedAt" FROM "Profile" WHERE id = ${profileId}
      `;
      assert.ok(rawProfile[0], "Artist should still exist in database");
      assert.ok(rawProfile[0].deletedAt, "Artist should have deletedAt set");
      assert.ok(
        rawProfile[0].deletedAt instanceof Date,
        "deletedAt should be a Date"
      );
    });

    it("should not return soft-deleted artists in list queries", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const profile1 = await createProfile(user.id, { name: "Artist 1" });
      const profile2 = await createProfile(user.id, { name: "Artist 2" });

      // Verify both artists exist
      let allProfiles = await prisma.profile.findMany();
      assert.equal(allProfiles.length, 2, "Should have 2 artists before delete");

      // Soft delete artist1
      await prisma.profile.delete({
        where: { id: profile1.id },
      });

      // Verify only artist2 is returned
      allProfiles = await prisma.profile.findMany();
      assert.equal(allProfiles.length, 1, "Should have 1 artist after delete");
      assert.equal(
        allProfiles[0].id,
        profile2.id,
        "Remaining artist should be artist2"
      );
    });

    it("should not return soft-deleted artists in findFirst with slug", async () => {
      const { user } = await createUser({
        email: "test@testcom",
      });
      const profile = await createProfile(user.id);

      // Soft delete the artist
      await prisma.profile.delete({
        where: { id: profile.id },
      });

      // Verify artist is not found via slug query
      const foundProfile = await prisma.profile.findFirst({
        where: { urlSlug: profile.urlSlug },
      });
      assert.strictEqual(
        foundProfile,
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
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);
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
      const profile = await createProfile(user.id);
      const trackGroup1 = await createTrackGroup(profile.id, {
        title: "Album 1",
        urlSlug: "album-1",
      });
      const trackGroup2 = await createTrackGroup(profile.id, {
        title: "Album 2",
        urlSlug: "album-2",
      });

      // Verify both trackgroups exist
      let allTrackGroups = await prisma.trackGroup.findMany({
        where: { profileId: profile.id },
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
        where: { profileId: profile.id },
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
      const profile = await createProfile(user.id);
      const trackGroup1 = await createTrackGroup(profile.id, {
        title: "Album 1",
        urlSlug: "album-1",
      });
      const trackGroup2 = await createTrackGroup(profile.id, {
        title: "Album 2",
        urlSlug: "album-2",
      });
      const trackGroup3 = await createTrackGroup(profile.id, {
        title: "Album 3",
        urlSlug: "album-3",
      });

      // Delete multiple trackgroups
      await prisma.trackGroup.deleteMany({
        where: {
          profileId: profile.id,
          id: { in: [trackGroup1.id, trackGroup2.id] },
        },
      });

      // Verify only trackGroup3 is returned
      const remaining = await prisma.trackGroup.findMany({
        where: { profileId: profile.id },
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
      const profile1 = await createProfile(user.id, { name: "Artist 1" });
      const profile2 = await createProfile(user.id, { name: "Artist 2" });
      const profile3 = await createProfile(user.id, { name: "Artist 3" });

      // Query before delete
      let allProfiles = await prisma.profile.findMany();
      assert.equal(allProfiles.length, 3);

      // Delete multiple artists
      await prisma.profile.deleteMany({
        where: { id: { in: [profile1.id, profile2.id] } },
      });

      // Verify only artist3 is returned
      allProfiles = await prisma.profile.findMany();
      assert.equal(allProfiles.length, 1, "Should have 1 artist remaining");
      assert.equal(allProfiles[0].id, profile3.id, "Remaining should be artist3");

      // Verify deletedAt is set for deleted artists
      const deletedProfiles = await prisma.$queryRaw<
        Array<{ id: number; deletedAt: Date | null }>
      >`
        SELECT id, "deletedAt" FROM "Profile" 
        WHERE id IN (${profile1.id}, ${profile2.id})
      `;
      assert.equal(
        deletedProfiles.length,
        2,
        "Both deleted artists should still exist"
      );
      deletedProfiles.forEach((a) => {
        assert.ok(a.deletedAt, `Artist ${a.id} should have deletedAt set`);
      });
    });
  });
});
