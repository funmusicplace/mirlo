import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createPost,
  createProfile,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

describe("artists/{id}/posts", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 404", async () => {
    const response = await requestApp
      .get("artists/1/posts")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should GET / the public posts of an artist", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id);
    const post = await createPost(profile.id, { isDraft: false });

    const response = await requestApp
      .get(`artists/${profile.id}/posts`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].id, post.id);
  });

  it("should GET / 404 when the artist is disabled", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id, { enabled: false });
    await createPost(profile.id, { isDraft: false });

    const response = await requestApp
      .get(`artists/${profile.id}/posts`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should GET / 200 for an admin when the artist is disabled", async () => {
    const { user } = await createUser({ email: "artist@artist.com" });
    const profile = await createProfile(user.id, { enabled: false });
    await createPost(profile.id, { isDraft: false });
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });

    const response = await requestApp
      .get(`artists/${profile.id}/posts`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results.length, 1);
  });
});
