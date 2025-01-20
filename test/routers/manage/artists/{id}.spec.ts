import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import { clearTables, createArtist, createUser } from "../../../utils";
import {
  createBucketIfNotExists,
  finalArtistAvatarBucket,
} from "../../../../src/utils/minio";

import { requestApp } from "../../utils";

describe("manage/artists/{artistId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should return artist for logged in user if owned", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      const response = await requestApp
        .get(`manage/artists/${artist.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
    });

    it("should not return artist for logged in user if not owned", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const { accessToken: otherAccessToken } = await createUser({
        email: "otherUser@test.com",
      });
      const artist = await createArtist(user.id);
      const response = await requestApp
        .get(`manage/artists/${artist.id}`)
        .set("Cookie", [`jwt=${otherAccessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should return artist for logged in admin even if not owned", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const { accessToken: adminAccessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });
      const artist = await createArtist(user.id);

      const response = await requestApp
        .get(`manage/artists/${artist.id}`)
        .set("Cookie", [`jwt=${adminAccessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
    });
  });

  describe("DELETE", () => {
    it("should succeed", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      await createBucketIfNotExists(finalArtistAvatarBucket);

      const response = await requestApp
        .delete(`manage/artists/${artist.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
    });
  });
});
