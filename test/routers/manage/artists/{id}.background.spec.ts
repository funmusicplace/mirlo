import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sharp from "sharp";

import {
  createBucketIfNotExists,
  getImagesBucket,
} from "../../../../src/utils/minio";
import { clearTables, createProfile, createUser } from "../../../utils";
import { requestApp } from "../../utils";

const setup = async () => {
  const { user, accessToken } = await createUser({ email: "test@testcom" });
  const profile = await createProfile(user.id);
  await createBucketIfNotExists(getImagesBucket());
  return { accessToken, profile };
};

const linkBackground = async (
  profileId: number,
  data: { url: string[]; keyPrefix?: string }
) => {
  const image = await prisma.image.create({
    data: { ...data, dimensions: "background", profileId },
  });
  await prisma.profile.update({
    where: { id: profileId },
    data: { backgroundImageId: image.id },
  });
  return image;
};

const png = () =>
  sharp({
    create: { width: 2, height: 2, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();

describe("manage/artists/{artistId}/background", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("links a new Image owned by the artist", async () => {
      const { accessToken, profile } = await setup();

      const response = await requestApp
        .put(`manage/artists/${profile.id}/background`)
        .attach("file", await png(), "background.png")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const { imageId } = response.body.result;
      const image = await prisma.image.findUniqueOrThrow({
        where: { id: imageId },
      });
      assert.equal(image.profileId, profile.id);
      assert.equal(image.dimensions, "background");
      assert.equal(image.keyPrefix, null);
      const updated = await prisma.profile.findUniqueOrThrow({
        where: { id: profile.id },
      });
      assert.equal(updated.backgroundImageId, imageId);
    });

    it("replaces the old background with a new Image", async () => {
      const { accessToken, profile } = await setup();
      const old = await linkBackground(profile.id, {
        url: ["old-x625"],
        keyPrefix: "artist-banners",
      });

      const response = await requestApp
        .put(`manage/artists/${profile.id}/background`)
        .attach("file", await png(), "background.png")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.notEqual(response.body.result.imageId, old.id);
      const oldImage = await prisma.image.findUniqueOrThrow({
        where: { id: old.id },
      });
      assert.notEqual(oldImage.deletedAt, null);
    });
  });

  describe("DELETE", () => {
    it("unlinks and soft-deletes the background", async () => {
      const { accessToken, profile } = await setup();
      const image = await linkBackground(profile.id, { url: [] });

      const response = await requestApp
        .delete(`manage/artists/${profile.id}/background`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const updated = await prisma.profile.findUniqueOrThrow({
        where: { id: profile.id },
      });
      assert.equal(updated.backgroundImageId, null);
      const deleted = await prisma.image.findUniqueOrThrow({
        where: { id: image.id },
      });
      assert.notEqual(deleted.deletedAt, null);
    });
  });

  describe("serializing", () => {
    it("serves a migrated background from its key prefix", async () => {
      const { profile } = await setup();
      await linkBackground(profile.id, {
        url: ["legacy-x625"],
        keyPrefix: "artist-banners",
      });

      const response = await requestApp
        .get(`artists/${profile.id}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.match(
        response.body.result.background.sizes["625"],
        /\/artist-banners\/legacy-x625/
      );
    });

    it("serves a new background from the bucket root", async () => {
      const { profile } = await setup();
      await linkBackground(profile.id, { url: ["new-x625"] });

      const response = await requestApp
        .get(`artists/${profile.id}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const url = response.body.result.background.sizes["625"];
      assert.match(url, /\/new-x625/);
      assert.doesNotMatch(url, /artist-banners/);
    });
  });
});
