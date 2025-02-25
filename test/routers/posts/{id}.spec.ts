import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import { clearTables, createArtist, createPost, createUser } from "../../utils";

import { faker } from "@faker-js/faker";
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
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id, { isDraft: false });

      const response = await requestApp
        .get(`posts/${post.id}`)
        .set("Accept", "application/json");

      assert.equal(response.body.result.id, post.id);
      assert.equal(response.statusCode, 200);
    });

    it("should GET / 404 if draft", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id);

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
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id, {
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
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id, {
        isDraft: false,
        isPublic: false,
        content: testContent,
      });

      const response = await requestApp
        .get(`posts/${post.id}`)
        .set("Accept", "application/json");

      assert.equal(response.body.result.content, testContent);
      assert.equal(response.body.result.isContentHidden, true);
    });
  });
});
