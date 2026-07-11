import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import { clearTables, createProfile, createPost, createUser } from "../../utils";

import { faker } from "@faker-js/faker";
import prisma from "@mirlo/prisma";
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
      const profile = await createProfile(user.id);
      const post = await createPost(profile.id, { isDraft: false });

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
      const profile = await createProfile(user.id);
      await createPost(profile.id);

      const response = await requestApp
        .get(`posts`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 0);
    });

    it("should GET exclude posts from disabled artists", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const profile = await createProfile(user.id, { enabled: false });
      await createPost(profile.id, { isDraft: false });

      const response = await requestApp
        .get(`posts`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 0);
    });

    it("should GET exclude posts from soft-deleted artists", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const profile = await createProfile(user.id);
      await prisma.profile.update({
        where: { id: profile.id },
        data: { deletedAt: new Date() },
      });
      await createPost(profile.id, { isDraft: false });

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
      const profile = await createProfile(user.id);
      await createPost(profile.id, {
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
