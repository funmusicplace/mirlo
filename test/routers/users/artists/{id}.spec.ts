import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import { clearTables, createArtist, createUser } from "../../../utils";
import prisma from "@mirlo/prisma";
import {
  minioClient,
  createBucketIfNotExists,
  finalArtistAvatarBucket,
} from "../../../../src/utils/minio";

import { requestApp } from "../../utils";

describe("users/{userId}/artists/{artistId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should fail gracefully with undefined user", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      const response = await requestApp
        .get(`users/undefined/artists/${artist.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return artist for logged in user if owned", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      const response = await requestApp
        .get(`users/${user.id}/artists/${artist.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
    });

    it("should not return artist for logged in user if not owned", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const { user: otherUser, accessToken: otherAccessToken } =
        await createUser({
          email: "otherUser@test.com",
        });
      const artist = await createArtist(user.id);
      const response = await requestApp
        .get(`users/${otherUser.id}/artists/${artist.id}`)
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
        .get(`users/${user.id}/artists/${artist.id}`)
        .set("Cookie", [`jwt=${adminAccessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
    });
  });

  describe("DELETE", () => {
    it("should fail gracefully with undefined user", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      await createBucketIfNotExists(minioClient, finalArtistAvatarBucket);

      await prisma.artistAvatar.create({
        data: {
          artistId: artist.id,
        },
      });

      const response = await requestApp
        .delete(`users/undefined/artists/${artist.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });
  });
});
