import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import { clearTables, createArtist, createUser } from "../../../utils";
import prisma from "../../../../prisma/prisma";
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
      await createBucketIfNotExists(minioClient, finalArtistAvatarBucket);

      await prisma.artistAvatar.create({
        data: {
          artistId: artist.id,
        },
      });

      const response = await requestApp
        .get(`users/undefined/artists/${artist.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
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
