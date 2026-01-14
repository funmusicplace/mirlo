import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../../utils";
import prisma from "@mirlo/prisma";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/trackGroups/{trackGroupId}/recommendedTrackGroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should GET recommended track groups for authenticated user", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const mainTrackGroup = await createTrackGroup(artist.id);
      const recommendedTrackGroup1 = await createTrackGroup(artist.id, {
        urlSlug: "recommended-album-1",
      });
      const recommendedTrackGroup2 = await createTrackGroup(artist.id, {
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
        .get(`manage/trackGroups/${mainTrackGroup.id}/recommendedTrackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
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
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .get(`manage/trackGroups/${trackGroup.id}/recommendedTrackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.deepEqual(response.body.results, []);
    });

    it("should require authentication", async () => {
      const { user } = await createUser({ email: "test@test.com" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .get(`manage/trackGroups/${trackGroup.id}/recommendedTrackGroups`)
        .set("Accept", "application/json");

      assert.equal(response.status, 401);
    });

    it("should prevent access to other user's track groups", async () => {
      const { user: user1, accessToken: accessToken1 } = await createUser({
        email: "test1@test.com",
      });
      const artist1 = await createArtist(user1.id);
      const trackGroup1 = await createTrackGroup(artist1.id);

      const { user: user2, accessToken: accessToken2 } = await createUser({
        email: "test2@test.com",
      });

      const response = await requestApp
        .get(`manage/trackGroups/${trackGroup1.id}/recommendedTrackGroups`)
        .set("Cookie", [`jwt=${accessToken2}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
    });
  });

  describe("PUT", () => {
    it("should add a recommended track group", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const mainTrackGroup = await createTrackGroup(artist.id);
      const recommendedTrackGroup = await createTrackGroup(artist.id, {
        urlSlug: "recommended-album",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${mainTrackGroup.id}/recommendedTrackGroups`)
        .send({
          recommendedTrackGroupId: recommendedTrackGroup.id,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(
        response.body.recommendedTrackGroup.id,
        recommendedTrackGroup.id
      );
      assert(response.body.trackGroupId === mainTrackGroup.id);
    });

    it("should not allow recommending the same track group", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/recommendedTrackGroups`)
        .send({
          recommendedTrackGroupId: trackGroup.id,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
      assert.equal(
        response.body.error,
        "Cannot recommend the same track group"
      );
    });

    it("should return 404 when recommended track group does not exist", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const mainTrackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .put(`manage/trackGroups/${mainTrackGroup.id}/recommendedTrackGroups`)
        .send({
          recommendedTrackGroupId: 99999,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
      assert.equal(response.body.error, "Recommended track group not found");
    });

    it("should require recommendedTrackGroupId in request body", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/recommendedTrackGroups`)
        .send({})
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
      assert.equal(response.body.error, "recommendedTrackGroupId is required");
    });

    it("should add the same recommendation without duplicating", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const mainTrackGroup = await createTrackGroup(artist.id);
      const recommendedTrackGroup = await createTrackGroup(artist.id, {
        urlSlug: "recommended-album",
      });

      const response1 = await requestApp
        .put(`manage/trackGroups/${mainTrackGroup.id}/recommendedTrackGroups`)
        .send({
          recommendedTrackGroupId: recommendedTrackGroup.id,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response1.status, 200);

      // Add the same recommendation again
      const response2 = await requestApp
        .put(`manage/trackGroups/${mainTrackGroup.id}/recommendedTrackGroups`)
        .send({
          recommendedTrackGroupId: recommendedTrackGroup.id,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response2.status, 200);

      // Verify only one recommendation exists via GET
      const getResponse = await requestApp
        .get(`manage/trackGroups/${mainTrackGroup.id}/recommendedTrackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(getResponse.body.results.length, 1);
    });

    it("should require authentication", async () => {
      const { user } = await createUser({ email: "test@test.com" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/recommendedTrackGroups`)
        .send({
          recommendedTrackGroupId: 1,
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 401);
    });

    it("should prevent access to other user's track groups", async () => {
      const { user: user1 } = await createUser({ email: "test1@test.com" });
      const artist1 = await createArtist(user1.id);
      const trackGroup1 = await createTrackGroup(artist1.id);
      const trackGroup2 = await createTrackGroup(artist1.id, {
        urlSlug: "recommended-album",
      });

      const { user: user2, accessToken: accessToken2 } = await createUser({
        email: "test2@test.com",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup1.id}/recommendedTrackGroups`)
        .send({
          recommendedTrackGroupId: trackGroup2.id,
        })
        .set("Cookie", [`jwt=${accessToken2}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
    });
  });

  describe("DELETE", () => {
    it("should remove a recommended track group", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const mainTrackGroup = await createTrackGroup(artist.id);
      const recommendedTrackGroup = await createTrackGroup(artist.id, {
        urlSlug: "recommended-album",
      });

      // Add recommendation directly to database
      await prisma.recommendedTrackGroup.create({
        data: {
          trackGroupId: mainTrackGroup.id,
          recommendedTrackGroupId: recommendedTrackGroup.id,
        },
      });

      // Verify it was added via database
      let existingRecommendations = await prisma.recommendedTrackGroup.findMany(
        {
          where: {
            trackGroupId: mainTrackGroup.id,
            recommendedTrackGroupId: recommendedTrackGroup.id,
          },
        }
      );
      assert.equal(existingRecommendations.length, 1);

      // Delete recommendation
      const deleteResponse = await requestApp
        .delete(
          `manage/trackGroups/${mainTrackGroup.id}/recommendedTrackGroups?recommendedTrackGroupId=${recommendedTrackGroup.id}`
        )
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(deleteResponse.status, 200);
      assert.equal(deleteResponse.body.success, true);

      // Verify it was deleted via database
      existingRecommendations = await prisma.recommendedTrackGroup.findMany({
        where: {
          trackGroupId: mainTrackGroup.id,
          recommendedTrackGroupId: recommendedTrackGroup.id,
        },
      });
      assert.deepEqual(existingRecommendations, []);
    });

    it("should require recommendedTrackGroupId query parameter", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .delete(`manage/trackGroups/${trackGroup.id}/recommendedTrackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
    });

    it("should require authentication", async () => {
      const { user } = await createUser({ email: "test@test.com" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .delete(
          `manage/trackGroups/${trackGroup.id}/recommendedTrackGroups?recommendedTrackGroupId=1`
        )
        .set("Accept", "application/json");

      assert.equal(response.status, 401);
    });

    it("should prevent access to other user's track groups", async () => {
      const { user: user1 } = await createUser({ email: "test1@test.com" });
      const artist1 = await createArtist(user1.id);
      const trackGroup1 = await createTrackGroup(artist1.id);
      const trackGroup2 = await createTrackGroup(artist1.id, {
        urlSlug: "recommended-album",
      });

      const { user: user2, accessToken: accessToken2 } = await createUser({
        email: "test2@test.com",
      });

      const response = await requestApp
        .delete(
          `manage/trackGroups/${trackGroup1.id}/recommendedTrackGroups?recommendedTrackGroupId=${trackGroup2.id}`
        )
        .set("Cookie", [`jwt=${accessToken2}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 404);

      const existingRecommendationsResponse =
        await prisma.recommendedTrackGroup.findMany({
          where: {
            trackGroupId: trackGroup1.id,
            recommendedTrackGroupId: trackGroup2.id,
          },
        });

      assert.equal(existingRecommendationsResponse.length, 0);
    });
  });
});
