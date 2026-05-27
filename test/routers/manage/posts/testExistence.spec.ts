import assert from "node:assert";

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

describe("manage/posts", () => {
  describe("/testExistence", () => {
    beforeEach(async () => {
      try {
        await clearTables();
      } catch (e) {
        console.error(e);
      }
    });

    it("should return true when urlSlug exists for the artist", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id, { urlSlug: "my-post" });

      const response = await requestApp
        .get(
          `manage/posts/testExistence?urlSlug=${post.urlSlug}&artistId=${artist.id}`
        )
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      assert.equal(response.body.result.exists, true);
    });

    it("should return false when urlSlug does not exist for the artist", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      await createPost(artist.id, { urlSlug: "existing-post" });

      const response = await requestApp
        .get(
          `manage/posts/testExistence?urlSlug=nonexistent-slug&artistId=${artist.id}`
        )
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      assert.equal(response.body.result.exists, false);
    });

    it("should return false when forPostId matches the post (excludes current post)", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const post = await createPost(artist.id, { urlSlug: "my-post" });

      const response = await requestApp
        .get(
          `manage/posts/testExistence?urlSlug=${post.urlSlug}&artistId=${artist.id}&forPostId=${post.id}`
        )
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      assert.equal(response.body.result.exists, false);
    });

    it("should return true for a different post with the same slug", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const post1 = await createPost(artist.id, { urlSlug: "shared-slug" });
      const post2 = await createPost(artist.id, { urlSlug: "other-post" });

      // post2 is checking if "shared-slug" is taken, excluding itself (post2)
      const response = await requestApp
        .get(
          `manage/posts/testExistence?urlSlug=${post1.urlSlug}&artistId=${artist.id}&forPostId=${post2.id}`
        )
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      assert.equal(response.body.result.exists, true);
    });

    it("should not match slugs from a different artist", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist1 = await createArtist(user.id, { urlSlug: "artist-one" });
      const { user: user2 } = await createUser({ email: "other@test.com" });
      const artist2 = await createArtist(user2.id, { urlSlug: "artist-two" });
      await createPost(artist2.id, { urlSlug: "shared-slug" });

      const response = await requestApp
        .get(
          `manage/posts/testExistence?urlSlug=shared-slug&artistId=${artist1.id}`
        )
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      assert.equal(response.body.result.exists, false);
    });

    it("should return 401 when not authenticated", async () => {
      const { user } = await createUser({ email: "test@test.com" });
      const artist = await createArtist(user.id);
      await createPost(artist.id, { urlSlug: "my-post" });

      const response = await requestApp
        .get(`manage/posts/testExistence?urlSlug=my-post&artistId=${artist.id}`)
        .set("Accept", "application/json");

      assert.equal(response.status, 401);
    });
  });
});
