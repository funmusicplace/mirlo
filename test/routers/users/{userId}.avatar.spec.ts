import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import prisma from "@mirlo/prisma";
import { describe, it } from "mocha";

import {
  createBucketIfNotExists,
  finalUserAvatarBucket,
} from "../../../src/utils/minio";
import { clearTables, createUser } from "../../utils";
import { requestApp } from "../utils";

describe("users/{userId}/avatar", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("DELETE", () => {
    it("should delete the user's avatar and not an artist avatar with the same id", async () => {
      const { user, accessToken } = await createUser({
        email: "user@testcom",
      });
      const { user: otherUser } = await createUser({
        email: "other@testcom",
      });
      // An unrelated artist page whose id happens to equal the user's id
      const profile = await prisma.profile.create({
        data: {
          id: user.id,
          name: "Unrelated artist",
          urlSlug: "unrelated-artist",
          userId: otherUser.id,
        },
      });
      await prisma.profileAvatar.create({ data: { profileId: profile.id } });
      await prisma.userAvatar.create({ data: { userId: user.id } });
      await createBucketIfNotExists(finalUserAvatarBucket);

      const response = await requestApp
        .delete(`users/${user.id}/avatar`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const userAvatar = await prisma.userAvatar.findFirst({
        where: { userId: user.id },
      });
      assert.equal(userAvatar, null);
      const profileAvatar = await prisma.profileAvatar.findFirst({
        where: { profileId: profile.id },
      });
      assert.notEqual(profileAvatar, null);
    });
  });
});
