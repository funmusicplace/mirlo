import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";

import { requestApp } from "../utils";
import prisma from "@mirlo/prisma";

describe("trackGroups/{id}/recommendedTrackGroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should GET recommended track groups for a published album", async () => {
      const { user } = await createUser({ email: "test@test.com" });
      const artist = await createArtist(user.id);
      const mainTrackGroup = await createTrackGroup(artist.id, {
        published: true,
      });
      const recommendedTrackGroup1 = await createTrackGroup(artist.id, {
        published: true,
        urlSlug: "recommended-album-1",
      });
      const recommendedTrackGroup2 = await createTrackGroup(artist.id, {
        published: true,
        urlSlug: "recommended-album-2",
      });

      // Add recommendations directly to database
      await prisma.recommendedTrackGroup.create({
        data: {
          trackGroupId: mainTrackGroup.id,
          recommendedTrackGroupId: recommendedTrackGroup1.id,
        },
      });

      await prisma.recommendedTrackGroup.create({
        data: {
          trackGroupId: mainTrackGroup.id,
          recommendedTrackGroupId: recommendedTrackGroup2.id,
        },
      });

      const response = await requestApp
        .get(`trackGroups/${mainTrackGroup.id}/recommendedTrackGroups`)
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 2);
      assert(
        response.body.results.some(
          (r: any) => r.id === recommendedTrackGroup1.id
        )
      );
      assert(
        response.body.results.some(
          (r: any) => r.id === recommendedTrackGroup2.id
        )
      );
    });

    it("should return empty array when no recommendations exist", async () => {
      const { user } = await createUser({ email: "test@test.com" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, { published: true });

      const response = await requestApp
        .get(`trackGroups/${trackGroup.id}/recommendedTrackGroups`)
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.deepEqual(response.body.results, []);
    });

    it("should return 404 for non-existent track group", async () => {
      const response = await requestApp
        .get(`trackGroups/99999/recommendedTrackGroups`)
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
      assert.equal(response.body.error, "Track group not found");
    });

    it("should include artist and cover data in recommendations", async () => {
      const { user } = await createUser({ email: "test@test.com" });
      const artist = await createArtist(user.id);
      const mainTrackGroup = await createTrackGroup(artist.id, {
        published: true,
      });
      const recommendedTrackGroup = await createTrackGroup(artist.id, {
        published: true,
        title: "Recommended Album",
        urlSlug: "recommended-album",
      });

      // Add recommendation directly to database
      await prisma.recommendedTrackGroup.create({
        data: {
          trackGroupId: mainTrackGroup.id,
          recommendedTrackGroupId: recommendedTrackGroup.id,
        },
      });

      const response = await requestApp
        .get(`trackGroups/${mainTrackGroup.id}/recommendedTrackGroups`)
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 1);
      const rec = response.body.results[0];
      assert.equal(rec.title, "Recommended Album");
      assert(rec.artist);
      assert.equal(rec.artist.name, artist.name);
    });
  });
});
