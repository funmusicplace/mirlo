import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createProfile,
  createPost,
  createPostImage,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

import prisma from "@mirlo/prisma";

describe("manage/posts/{postId}/featuredImage", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/", () => {
    it("should PUT to update the featuredImage image of a post", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const profile = await createProfile(user.id);
      const post = await createPost(profile.id);
      const image = await createPostImage(post);

      await requestApp
        .put(`manage/posts/${post.id}/featuredImage`)
        .send({
          featuredImageId: image.id,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const updatedPost = await prisma.post.findFirst({
        where: { id: post.id },
      });
      assert.equal(updatedPost?.featuredImageId, image.id);
    });

    it("should not PUT an image from another post", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const profile = await createProfile(user.id);
      const post = await createPost(profile.id);
      const otherPost = await createPost(profile.id);
      const image = await createPostImage(otherPost);

      const response = await requestApp
        .put(`manage/posts/${post.id}/featuredImage`)
        .send({
          featuredImageId: image.id,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
      const updatedPost = await prisma.post.findFirst({
        where: { id: post.id },
      });
      assert.equal(updatedPost?.featuredImageId, null);
    });
  });
});
