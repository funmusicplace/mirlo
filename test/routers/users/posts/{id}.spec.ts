import assert from "node:assert";
import prisma from "../../../../prisma/prisma";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import {
  clearTables,
  createArtist,
  createPost,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("users/{userId}/posts/{postId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("should PUT / a new title", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });

      const artist = await createArtist(user.id);
      const post = await createPost(artist.id);
      const response = await requestApp
        .put(`users/${user.id}/posts/${post.id}`)
        .send({
          title: "new title",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.deepEqual(response.body.result.title, "new title");
      assert(response.statusCode === 200);
    });

    it("should PUT / handle a non-existing minimum tier", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });

      const artist = await createArtist(user.id);
      const post = await createPost(artist.id);
      const response = await requestApp
        .put(`users/${user.id}/posts/${post.id}`)
        .send({
          minimumSubscriptionTierId: 0,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.deepEqual(
        response.body.error,
        "That subscription tier isn't associated with the artist"
      );
      assert(response.statusCode === 400);
    });

    it("should PUT / handle existing minimum tier", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });

      const artist = await createArtist(user.id, {
        subscriptionTiers: {
          create: {
            name: "a tier",
          },
        },
      });

      const post = await createPost(artist.id);
      const response = await requestApp
        .put(`users/${user.id}/posts/${post.id}`)
        .send({
          minimumSubscriptionTierId: artist.subscriptionTiers[0].id,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.deepEqual(
        response.body.result.minimumSubscriptionTierId,
        artist.subscriptionTiers[0].id
      );
      assert.deepEqual(response.body.result.title, post.title);
      assert(response.statusCode === 200);
    });
  });

  describe("DELETE", () => {
    it("should DELETE a post", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });

      const artist = await createArtist(user.id);
      const post = await createPost(artist.id);
      const response = await requestApp
        .delete(`users/${user.id}/posts/${post.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      const refetchedPost = await prisma.post.findFirst({
        where: {
          id: post.id,
        },
      });

      assert.equal(refetchedPost, null);
    });
  });
});
