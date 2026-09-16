import assert from "node:assert";

import { faker } from "@faker-js/faker";
import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createProfile,
  createPost,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

describe("posts/{id}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/", () => {
    it("should GET / 404", async () => {
      const response = await requestApp
        .get("posts/1")
        .set("Accept", "application/json");

      assert(response.statusCode === 404);
    });

    it("should GET / 200", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const profile = await createProfile(user.id);
      const post = await createPost(profile.id, { isDraft: false });

      const response = await requestApp
        .get(`posts/${post.id}`)
        .set("Accept", "application/json");

      assert.equal(response.body.result.id, post.id);
      assert.equal(response.statusCode, 200);
    });

    it("should GET / 404 when the artist is disabled", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const profile = await createProfile(user.id, { enabled: false });
      const post = await createPost(profile.id, { isDraft: false });

      const response = await requestApp
        .get(`posts/${post.id}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should GET / 200 for an admin when the artist is disabled", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const profile = await createProfile(user.id, { enabled: false });
      const post = await createPost(profile.id, { isDraft: false });
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const response = await requestApp
        .get(`posts/${post.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.id, post.id);
    });

    it("should GET / 200 for a post without an artist", async () => {
      const post = await prisma.post.create({
        data: { title: "Platform news", isDraft: false, isPublic: true },
      });

      const response = await requestApp
        .get(`posts/${post.id}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.id, post.id);
    });

    it("should GET / 404 if draft", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const profile = await createProfile(user.id);
      const post = await createPost(profile.id);

      const response = await requestApp
        .get(`posts/${post.id}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should GET / and show content if public", async () => {
      const testContent = faker.lorem.paragraph();
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const profile = await createProfile(user.id);
      const post = await createPost(profile.id, {
        content: testContent,
        isDraft: false,
      });

      const response = await requestApp
        .get(`posts/${post.id}`)
        .set("Accept", "application/json");

      assert.equal(response.body.result.content, testContent);
    });

    it("should GET / send hide content boolean if not public", async () => {
      const testContent = faker.lorem.paragraph();
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const profile = await createProfile(user.id);
      const post = await createPost(profile.id, {
        isDraft: false,
        isPublic: false,
        content: testContent,
        publishedAt: faker.date.past(),
      });

      const response = await requestApp
        .get(`posts/${post.id}`)
        .set("Accept", "application/json");

      assert.equal(response.body.result.content, null);
      assert.equal(response.body.result.isContentHidden, true);
    });
  });
});
