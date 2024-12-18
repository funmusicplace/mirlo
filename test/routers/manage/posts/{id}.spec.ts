import assert from "node:assert";
import prisma from "@mirlo/prisma";

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

describe("manage/posts/{postId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("should not PUT for a non-admin user", async () => {
      const { user: owner } = await createUser({
        email: "owner@test.com",
      });

      const { accessToken: nonAdminToken } = await createUser({
        email: "test@test.com",
      });

      const artist = await createArtist(owner.id);
      const post = await createPost(artist.id);
      const response = await requestApp
        .put(`manage/posts/${post.id}`)
        .send({
          title: "new title",
        })
        .set("Cookie", [`jwt=${nonAdminToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.error, "Post must belong to user");
      assert.equal(response.statusCode, 401);
    });

    it("should not PUT for a non-admin user", async () => {
      const { user: owner } = await createUser({
        email: "owner@test.com",
      });

      const { accessToken: adminToken } = await createUser({
        email: "test@test.com",
        isAdmin: true,
      });

      const artist = await createArtist(owner.id);
      const post = await createPost(artist.id);
      const response = await requestApp
        .put(`manage/posts/${post.id}`)
        .send({
          title: "new title",
        })
        .set("Cookie", [`jwt=${adminToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.result.title, "new title");
      assert.equal(response.statusCode, 200);
    });

    it("should PUT / a new title", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });

      const artist = await createArtist(user.id);
      const post = await createPost(artist.id);
      const response = await requestApp
        .put(`manage/posts/${post.id}`)
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
        .put(`manage/posts/${post.id}`)
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
        .put(`manage/posts/${post.id}`)
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

    it("should PUT and update shouldSendEmail", async () => {
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

      const post = await createPost(artist.id, {
        shouldSendEmail: true,
      });
      assert.equal(post.shouldSendEmail, true);

      const response = await requestApp
        .put(`manage/posts/${post.id}`)
        .send({
          shouldSendEmail: false,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.result.shouldSendEmail, false);
      assert.equal(response.statusCode, 200);
      const refreshedPost = await prisma.post.findFirst({
        where: {
          id: post.id,
        },
      });
      assert.equal(refreshedPost?.shouldSendEmail, false);
    });

    it("should PUT and remove unused images", async () => {
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

      const post = await createPost(artist.id, {
        shouldSendEmail: true,
      });

      const image1 = await prisma.postImage.create({
        data: {
          postId: post.id,
          mimeType: "image/jpeg",
          extension: "jpg",
        },
      });

      const image2 = await prisma.postImage.create({
        data: {
          postId: post.id,
          mimeType: "image/jpeg",
          extension: "jpg",
        },
      });
      await prisma.post.update({
        where: {
          id: post.id,
        },
        data: {
          featuredImageId: image2.id,
        },
      });

      await prisma.postImage.create({
        data: {
          postId: post.id,
          mimeType: "image/jpeg",
          extension: "jpg",
        },
      });

      const firstConfirmation = await prisma.postImage.findMany({
        where: {
          postId: post.id,
        },
      });
      assert.equal(firstConfirmation.length, 3);

      await requestApp
        .put(`manage/posts/${post.id}`)
        .send({
          content: `<html><img src="${image1.id}.${image1.extension}"/></html>`,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const refetchedImages = await prisma.postImage.findMany({
        where: {
          postId: post.id,
        },
      });
      assert.equal(refetchedImages.length, 2);
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
        .delete(`manage/posts/${post.id}`)
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

    it("should DELETE a posts images", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });

      const artist = await createArtist(user.id);
      const post = await createPost(artist.id);

      const image = await prisma.postImage.create({
        data: {
          postId: post.id,
          mimeType: "image/jpeg",
          extension: "jpg",
        },
      });

      const response = await requestApp
        .delete(`manage/posts/${post.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      const fetchedImage = await prisma.postImage.findFirst({
        where: {
          id: image.id,
        },
      });

      assert.equal(fetchedImage, null);
    });
  });
});
