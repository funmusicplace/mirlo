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

describe("manage/artists/{artistId}/avatar", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("keeps the old avatar and marks a new Image owned by the artist as pending", async () => {
      const { accessToken, profile } = await setup();
      const old = await createProfileImage(profile.id, "avatar", {
        url: ["old-x600"],
        keyPrefix: "artist-avatars",
      });

      const response = await requestApp
        .put(`manage/artists/${profile.id}/avatar`)
        .attach("file", await png(), "avatar.png")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const { imageId } = response.body.result;
      assert.notEqual(imageId, old.id);
      const image = await prisma.image.findUniqueOrThrow({
        where: { id: imageId },
      });
      assert.equal(image.profileId, profile.id);
      assert.equal(image.dimensions, "avatar");
      assert.equal(image.keyPrefix, null);
      const updated = await prisma.profile.findUniqueOrThrow({
        where: { id: profile.id },
      });
      assert.equal(updated.avatarImageId, old.id);
      assert.equal(await findPendingImageId("AVATAR", profile.id), imageId);
    });

    it("replaces the old avatar once the new one is attached", async () => {
      const { profile } = await setup();
      const old = await createProfileImage(profile.id, "avatar", {
        url: ["old-x600"],
      });
      const next = await prisma.image.create({
        data: {
          dimensions: "avatar",
          profileId: profile.id,
          url: ["new-x600"],
        },
      });
      await markPendingImage("AVATAR", profile.id, next.id);

      await attachPendingImage(next.id);

      const updated = await prisma.profile.findUniqueOrThrow({
        where: { id: profile.id },
      });
      assert.equal(updated.avatarImageId, next.id);
      assert.equal(await findPendingImageId("AVATAR", profile.id), null);
      const oldImage = await prisma.image.findUniqueOrThrow({
        where: { id: old.id },
      });
      assert.notEqual(oldImage.deletedAt, null);
    });
  });

  describe("DELETE", () => {
    it("unlinks and soft-deletes the avatar and cancels the pending one", async () => {
      const { accessToken, profile } = await setup();
      const image = await createProfileImage(profile.id, "avatar");
      const pending = await prisma.image.create({
        data: { dimensions: "avatar", profileId: profile.id },
      });
      await markPendingImage("AVATAR", profile.id, pending.id);

      const response = await requestApp
        .delete(`manage/artists/${profile.id}/avatar`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const updated = await prisma.profile.findUniqueOrThrow({
        where: { id: profile.id },
      });
      assert.equal(updated.avatarImageId, null);
      assert.equal(await findPendingImageId("AVATAR", profile.id), null);
      const deleted = await prisma.image.findUniqueOrThrow({
        where: { id: image.id },
      });
      assert.notEqual(deleted.deletedAt, null);
    });
  });

  describe("serializing", () => {
    it("serves a migrated avatar from its key prefix", async () => {
      const { profile } = await setup();
      await createProfileImage(profile.id, "avatar", {
        url: ["legacy-x600"],
        keyPrefix: "artist-avatars",
      });

      const response = await requestApp
        .get(`artists/${profile.id}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.match(
        response.body.result.avatar.sizes["600"],
        /\/artist-avatars\/legacy-x600/
      );
    });
  });
});
