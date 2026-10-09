import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sharp from "sharp";

import {
  clearTables,
  createProfile,
  createTier,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

const createPng = () =>
  sharp({ create: { width: 2, height: 2, channels: 3, background: "#fff" } })
    .png()
    .toBuffer();

describe("manage/artists/{artistId}/images", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("creates an image owned by the artist", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);

      const response = await requestApp
        .put(`manage/artists/${profile.id}/images`)
        .field("dimensions", "square")
        .attach("file", await createPng(), "tier.png")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      const image = await prisma.image.findUniqueOrThrow({
        where: { id: response.body.result.imageId },
      });
      assert.equal(image.profileId, profile.id);
    });

    it("doesn't upload into another artist's image", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const { user: otherUser } = await createUser({
        email: "other@testcom",
      });
      const otherProfile = await createProfile(otherUser.id, {
        urlSlug: "other",
      });
      const otherImage = await prisma.image.create({
        data: { dimensions: "square", profileId: otherProfile.id },
      });

      const response = await requestApp
        .put(`manage/artists/${profile.id}/images`)
        .field("dimensions", "square")
        .field("imageId", otherImage.id)
        .attach("file", await createPng(), "tier.png")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.notEqual(response.body.result.imageId, otherImage.id);
      const image = await prisma.image.findUniqueOrThrow({
        where: { id: response.body.result.imageId },
      });
      assert.equal(image.profileId, profile.id);
    });
  });

  describe("DELETE", () => {
    it("deletes an image owned by the artist", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const image = await prisma.image.create({
        data: { dimensions: "square", profileId: profile.id },
      });

      const response = await requestApp
        .delete(`manage/artists/${profile.id}/images/${image.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      const deleted = await prisma.image.findUniqueOrThrow({
        where: { id: image.id },
      });
      assert.notEqual(deleted.deletedAt, null);
    });

    it("doesn't delete another artist's image linked to the artist's tier", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const { user: otherUser } = await createUser({
        email: "other@testcom",
      });
      const otherProfile = await createProfile(otherUser.id, {
        urlSlug: "other",
      });
      const otherImage = await prisma.image.create({
        data: { dimensions: "square", profileId: otherProfile.id },
      });
      const tier = await createTier(profile.id);
      await prisma.subscriptionTierImage.create({
        data: { tierId: tier.id, imageId: otherImage.id },
      });

      const response = await requestApp
        .delete(`manage/artists/${profile.id}/images/${otherImage.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
      const kept = await prisma.image.findUniqueOrThrow({
        where: { id: otherImage.id },
      });
      assert.equal(kept.deletedAt, null);
    });
  });
});
