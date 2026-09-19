import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  createBucketIfNotExists,
  finalArtistAvatarBucket,
} from "../../../../src/utils/minio";
import {
  clearTables,
  createArtistLabel,
  createProfile,
  createUser,
} from "../../../utils";
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
      const profile = await createProfile(user.id);

      const response = await requestApp
        .get(`manage/artists/${profile.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
    });

    it("should not return artist for logged in user if not owned", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const { accessToken: otherAccessToken } = await createUser({
        email: "otherUser@test.com",
      });
      const profile = await createProfile(user.id);
      const response = await requestApp
        .get(`manage/artists/${profile.id}`)
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
      const profile = await createProfile(user.id);

      const response = await requestApp
        .get(`manage/artists/${profile.id}`)
        .set("Cookie", [`jwt=${adminAccessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
    });
  });

  describe("PUT paymentToUserId", () => {
    it("should set the payment receiver to a mutually approved label", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const { user: labelUser } = await createUser({ email: "label@test.com" });
      const profile = await createProfile(user.id);
      await createArtistLabel({
        artistId: profile.id,
        labelUserId: labelUser.id,
        isArtistApproved: true,
        isLabelApproved: true,
      });

      const response = await requestApp
        .put(`manage/artists/${profile.id}`)
        .send({ paymentToUserId: labelUser.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const updated = await prisma.profile.findFirstOrThrow({
        where: { id: profile.id },
      });
      assert.equal(updated.paymentToUserId, labelUser.id);
    });

    it("should refuse a label the artist hasn't approved", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const { user: labelUser } = await createUser({ email: "label@test.com" });
      const profile = await createProfile(user.id);
      await createArtistLabel({
        artistId: profile.id,
        labelUserId: labelUser.id,
        isArtistApproved: false,
        isLabelApproved: true,
      });

      const response = await requestApp
        .put(`manage/artists/${profile.id}`)
        .send({ paymentToUserId: labelUser.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      const updated = await prisma.profile.findFirstOrThrow({
        where: { id: profile.id },
      });
      assert.equal(updated.paymentToUserId, null);
    });

    it("should refuse a user who isn't a label for this artist at all", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const { user: stranger } = await createUser({
        email: "stranger@test.com",
      });
      const profile = await createProfile(user.id);

      const response = await requestApp
        .put(`manage/artists/${profile.id}`)
        .send({ paymentToUserId: stranger.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should clear the payment receiver when passed null", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const { user: labelUser } = await createUser({ email: "label@test.com" });
      const profile = await createProfile(user.id, {
        paymentToUserId: labelUser.id,
      });

      const response = await requestApp
        .put(`manage/artists/${profile.id}`)
        .send({ paymentToUserId: null })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const updated = await prisma.profile.findFirstOrThrow({
        where: { id: profile.id },
      });
      assert.equal(updated.paymentToUserId, null);
    });
  });

  describe("DELETE", () => {
    it("should succeed", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const profile = await createProfile(user.id);
      await createBucketIfNotExists(finalArtistAvatarBucket);

      const response = await requestApp
        .delete(`manage/artists/${profile.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
    });
  });
});
