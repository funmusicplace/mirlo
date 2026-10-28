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
  createTrackGroup,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

const setup = async () => {
  const { user, accessToken } = await createUser({ email: "test@testcom" });
  const profile = await createProfile(user.id);
  const trackGroup = await createTrackGroup(profile.id, {
    cover: {
      create: {
        url: ["legacy-x600"],
        dimensions: "artwork",
        keyPrefix: "trackgroup-covers",
      },
    },
  });
  await createBucketIfNotExists(getImagesBucket());
  return { accessToken, profile, trackGroup };
};

const png = () =>
  sharp({
    create: { width: 2, height: 2, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();

const findPendingCoverId = async (trackGroupId: number) =>
  (
    await prisma.pendingImage.findUnique({
      where: { slot_ownerId: { slot: "COVER", ownerId: trackGroupId } },
    })
  )?.imageId ?? null;

describe("manage/trackGroups/{trackGroupId}/cover", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("keeps the old cover and marks a new Image owned by the artist as pending", async () => {
      const { accessToken, profile, trackGroup } = await setup();

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/cover`)
        .attach("file", await png(), "cover.png")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const { imageId } = response.body.result;
      assert.notEqual(imageId, trackGroup.coverImageId);
      const image = await prisma.image.findUniqueOrThrow({
        where: { id: imageId },
      });
      assert.equal(image.profileId, profile.id);
      assert.equal(image.dimensions, "artwork");
      assert.equal(image.keyPrefix, null);
      const updated = await prisma.trackGroup.findUniqueOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(updated.coverImageId, trackGroup.coverImageId);
      assert.equal(await findPendingCoverId(trackGroup.id), imageId);
    });

    it("replaces the old cover once the new one is attached", async () => {
      const { profile, trackGroup } = await setup();
      const next = await prisma.image.create({
        data: {
          dimensions: "artwork",
          profileId: profile.id,
          url: ["new-x600"],
        },
      });
      await markPendingImage("COVER", trackGroup.id, next.id);

      await attachPendingImage(next.id);

      const updated = await prisma.trackGroup.findUniqueOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(updated.coverImageId, next.id);
      assert.equal(await findPendingCoverId(trackGroup.id), null);
      const old = await prisma.image.findUniqueOrThrow({
        where: { id: trackGroup.coverImageId! },
      });
      assert.notEqual(old.deletedAt, null);
    });
  });

  describe("DELETE", () => {
    it("unlinks and soft-deletes the cover and cancels the pending one", async () => {
      const { accessToken, profile, trackGroup } = await setup();
      const pending = await prisma.image.create({
        data: { dimensions: "artwork", profileId: profile.id },
      });
      await markPendingImage("COVER", trackGroup.id, pending.id);

      const response = await requestApp
        .delete(`manage/trackGroups/${trackGroup.id}/cover`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const updated = await prisma.trackGroup.findUniqueOrThrow({
        where: { id: trackGroup.id },
      });
      assert.equal(updated.coverImageId, null);
      assert.equal(await findPendingCoverId(trackGroup.id), null);
      const deleted = await prisma.image.findUniqueOrThrow({
        where: { id: trackGroup.coverImageId! },
      });
      assert.notEqual(deleted.deletedAt, null);
    });
  });

  describe("serializing", () => {
    it("serves a migrated cover from its key prefix", async () => {
      const { trackGroup } = await setup();

      const response = await requestApp
        .get(`trackGroups/${trackGroup.id}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.match(
        response.body.result.cover.sizes["600"],
        /\/trackgroup-covers\/legacy-x600/
      );
    });
  });
});
