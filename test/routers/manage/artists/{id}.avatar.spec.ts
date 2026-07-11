import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import { clearTables, createProfile, createUser } from "../../../utils";
import prisma from "@mirlo/prisma";
import {
  createBucketIfNotExists,
  finalArtistAvatarBucket,
} from "../../../../src/utils/minio";

import { requestApp } from "../../utils";

describe("manage/artists/{artistId}/avatar", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("DELETE", () => {
    it("should DELETE with one artist", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      await createBucketIfNotExists(finalArtistAvatarBucket);

      await prisma.profileAvatar.create({
        data: {
          profileId: profile.id,
        },
      });

      const response = await requestApp
        .delete(`manage/artists/${profile.id}/avatar`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const foundOld = await prisma.profileAvatar.findFirst({
        where: { profileId: profile.id },
      });

      assert.equal(response.statusCode, 200);
      assert.equal(foundOld, null);

      // TODO: make sure image folder was deleted
    });
  });
});
