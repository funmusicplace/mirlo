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
import {
  attachPendingImage,
  markPendingImage,
} from "../../../../src/utils/pendingImage";
import {
  clearTables,
  createProfile,
  createProfileImage,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

const setup = async () => {
  const { user, accessToken } = await createUser({ email: "test@testcom" });
  const profile = await createProfile(user.id);
  await createBucketIfNotExists(getImagesBucket());
  return { accessToken, profile };
};

const png = () =>
  sharp({
    create: { width: 2, height: 2, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();

const findPendingImageId = async (
  slot: "AVATAR" | "BACKGROUND",
  ownerId: number
) =>
  (
    await prisma.pendingImage.findUnique({
      where: { slot_ownerId: { slot, ownerId } },
    })
  )?.imageId ?? null;

describe("manage/artists/{artistId}/background", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("marks a new Image owned by the artist as pending", async () => {
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
      assert.equal(updated.backgroundImageId, null);
      assert.equal(await findPendingImageId("BACKGROUND", profile.id), imageId);
    });

    it("replaces the old background once the new one is attached", async () => {
      const { profile } = await setup();
      const old = await createProfileImage(profile.id, "background", {
        url: ["old-x625"],
        keyPrefix: "artist-banners",
      });
      const next = await prisma.image.create({
        data: {
          dimensions: "background",
          profileId: profile.id,
          url: ["new-x625"],
        },
      });
      await markPendingImage("BACKGROUND", profile.id, next.id);

      await attachPendingImage(next.id);

      const updated = await prisma.profile.findUniqueOrThrow({
        where: { id: profile.id },
      });
      assert.equal(updated.backgroundImageId, next.id);
      const oldImage = await prisma.image.findUniqueOrThrow({
        where: { id: old.id },
      });
      assert.notEqual(oldImage.deletedAt, null);
    });

    it("keeps the old background when the upload fails", async () => {
      const { accessToken, profile } = await setup();
      const old = await createProfileImage(profile.id, "background", {
        url: ["old-x625"],
        keyPrefix: "artist-banners",
      });

      const response = await requestApp
        .put(`manage/artists/${profile.id}/background`)
        .attach("file", Buffer.from("not an image"), "background.png")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 406);
      const updated = await prisma.profile.findUniqueOrThrow({
        where: { id: profile.id },
      });
      assert.equal(updated.backgroundImageId, old.id);
      assert.equal(await findPendingImageId("BACKGROUND", profile.id), null);
      const oldImage = await prisma.image.findUniqueOrThrow({
        where: { id: old.id },
      });
      assert.equal(oldImage.deletedAt, null);
    });
  });

  describe("DELETE", () => {
    it("unlinks and soft-deletes the background", async () => {
      const { accessToken, profile } = await setup();
      const image = await createProfileImage(profile.id, "background", {
        url: [],
      });

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
      await createProfileImage(profile.id, "background", {
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
      await createProfileImage(profile.id, "background", { url: ["new-x625"] });

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
