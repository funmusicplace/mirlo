import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import { clearTables, createArtist, createPost, createUser } from "../../utils";

import { faker } from "@faker-js/faker";
import { requestApp } from "../utils";

describe("posts", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/", () => {
    it("should GET / 200", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id, { isDraft: false });

      const response = await requestApp
        .get(`posts`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results[0].id, post.id);
    });

    it("should GET exclude drafts", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      await createPost(artist.id);

      const response = await requestApp
        .get(`posts`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 0);
    });

    it("should GET / and show content if public", async () => {
      const testContent = faker.lorem.paragraph();
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      await createPost(artist.id, {
        content: testContent,
        isDraft: false,
      });

      const response = await requestApp
        .get(`posts`)
        .set("Accept", "application/json");

      assert.equal(response.body.results[0].content, testContent);
    });
  });
});
