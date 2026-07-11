import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import {
  clearTables,
  createProfile,
  createPost,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/artists/{artistId}/posts", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should return an empty array when artist has no posts", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const profile = await createProfile(user.id);

      const response = await requestApp
        .get(`manage/artists/${profile.id}/posts`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body.results, []);
    });

    it("should return posts for the artist", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const profile = await createProfile(user.id);
      const post = await createPost(profile.id, { title: "My post" });

      const response = await requestApp
        .get(`manage/artists/${profile.id}/posts`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].id, post.id);
      assert.equal(response.body.results[0].title, "My post");
    });

    it("should return 404 when artist doesn't belong to user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });
      const { user: profileOwner } = await createUser({
        email: "artist@test.com",
      });
      const profile = await createProfile(profileOwner.id);

      const response = await requestApp
        .get(`manage/artists/${profile.id}/posts`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should return 401 when not authenticated", async () => {
      const { user } = await createUser({ email: "test@test.com" });
      const profile = await createProfile(user.id);

      const response = await requestApp
        .get(`manage/artists/${profile.id}/posts`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("admin should be able to GET posts for another artist", async () => {
      const { user: profileOwner } = await createUser({
        email: "artist@test.com",
      });
      const { accessToken: adminToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      const profile = await createProfile(profileOwner.id);
      await createPost(profile.id, { title: "Admin-visible post" });

      const response = await requestApp
        .get(`manage/artists/${profile.id}/posts`)
        .set("Cookie", [`jwt=${adminToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].title, "Admin-visible post");
    });
  });

  describe("POST", () => {
    it("should create a post and auto-create a default tier when none exists", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const profile = await createProfile(user.id);

      const response = await requestApp
        .post(`manage/artists/${profile.id}/posts`)
        .send({ title: "My title", content: "Some content" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.title, "My title");
      assert.equal(response.body.result.shouldSendEmail, true);
    });

    it("should create a post using an existing default tier", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const profile = await createProfile(user.id, {
        subscriptionTiers: {
          create: { name: "a tier", isDefaultTier: true },
        },
      });

      const response = await requestApp
        .post(`manage/artists/${profile.id}/posts`)
        .send({ title: "My title", content: "Some content" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.title, "My title");
    });

    it("should set shouldSendEmail to false when specified", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const profile = await createProfile(user.id, {
        subscriptionTiers: {
          create: { name: "a tier", isDefaultTier: true },
        },
      });

      const response = await requestApp
        .post(`manage/artists/${profile.id}/posts`)
        .send({
          title: "My title",
          content: "Some content",
          shouldSendEmail: false,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.shouldSendEmail, false);
    });

    it("should create a post with an empty title", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const profile = await createProfile(user.id);

      const response = await requestApp
        .post(`manage/artists/${profile.id}/posts`)
        .send({ title: "" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.title, "");
    });

    it("should return 404 when artist doesn't belong to user", async () => {
      const { accessToken } = await createUser({ email: "user@test.com" });
      const { user: profileOwner } = await createUser({
        email: "artist@test.com",
      });
      const profile = await createProfile(profileOwner.id);

      const response = await requestApp
        .post(`manage/artists/${profile.id}/posts`)
        .send({ title: "A title" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
      assert.equal(
        response.body.error,
        "Artist not found or user does not have permission to edit"
      );
    });

    it("should return 400 when tier doesn't belong to the artist", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const { user: otherUser } = await createUser({
        email: "other@test.com",
      });
      const otherProfile = await createProfile(otherUser.id, {
        subscriptionTiers: {
          create: { name: "a tier", isDefaultTier: true },
        },
      });
      const profile = await createProfile(user.id);

      const response = await requestApp
        .post(`manage/artists/${profile.id}/posts`)
        .send({
          title: "A title",
          minimumSubscriptionTierId: otherProfile.subscriptionTiers[0].id,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
      assert.equal(
        response.body.error,
        "That tier doesn't belong to the current artist"
      );
    });

    it("admin should be able to POST a post for another artist", async () => {
      const { user: profileOwner } = await createUser({
        email: "artist@test.com",
      });
      const { accessToken: adminToken } = await createUser({
        email: "admin@test.com",
        isAdmin: true,
      });
      const profile = await createProfile(profileOwner.id);

      const response = await requestApp
        .post(`manage/artists/${profile.id}/posts`)
        .send({ title: "Admin post", content: "Written by admin" })
        .set("Cookie", [`jwt=${adminToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.title, "Admin post");
    });
  });
});
