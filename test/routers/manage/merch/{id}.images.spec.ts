import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sharp from "sharp";
import request from "supertest";

import {
  clearTables,
  createMerch,
  createProfile,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

const setup = async () => {
  const { user, accessToken } = await createUser({ email: "test@testcom" });
  const profile = await createProfile(user.id);
  const merch = await createMerch(profile.id, {});

  const legacy = await prisma.merchImage.create({
    data: {
      merchId: merch.id,
      url: ["legacy-x600", "legacy-x120"],
      position: 0,
    },
  });
  const image = await prisma.image.create({
    data: { url: ["central-x600", "central-x120"], dimensions: "square" },
  });
  const central = await prisma.merchImage.create({
    data: { merchId: merch.id, imageId: image.id, position: 1 },
  });

  return { accessToken, profile, merch, legacy, central, image };
};

describe("manage/merch/{merchId}/images", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("serializes legacy and central images in position order with sizes from their own bucket", async () => {
    const { accessToken, merch, legacy, central } = await setup();

    const response = await requestApp
      .get(`manage/merch/${merch.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    const images = response.body.result.images;
    assert.deepEqual(
      images.map((i: { id: string }) => i.id),
      [legacy.id, central.id]
    );
    assert.match(images[0].sizes["600"], /merch-images/);
    assert.doesNotMatch(images[1].sizes["600"], /merch-images/);
    assert.match(images[1].sizes["600"], /mirlo-images/);
  });

  it("uploads an image owned by the merch's artist", async () => {
    const { accessToken, profile, merch } = await setup();
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();

    const response = await requestApp
      .post(`manage/merch/${merch.id}/images`)
      .attach("file", png, "photo.png")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    const image = await prisma.image.findUniqueOrThrow({
      where: { id: response.body.result.imageId },
    });
    assert.equal(image.profileId, profile.id);
  });

  it("reorders images", async () => {
    const { accessToken, merch, legacy, central } = await setup();

    const response = await requestApp
      .put(`manage/merch/${merch.id}/images`)
      .send({ merchImageIds: [central.id, legacy.id] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.results.map((i: { id: string }) => i.id),
      [central.id, legacy.id]
    );
  });

  it("rejects a reorder that doesn't list every image", async () => {
    const { accessToken, merch, central } = await setup();

    const response = await requestApp
      .put(`manage/merch/${merch.id}/images`)
      .send({ merchImageIds: [central.id] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 400);
  });

  it("deletes a central image and soft-deletes its Image", async () => {
    const { accessToken, merch, central, image } = await setup();

    const response = await requestApp
      .delete(`manage/merch/${merch.id}/images/${central.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(
      await prisma.merchImage.findUnique({ where: { id: central.id } }),
      null
    );
    const deleted = await prisma.image.findUnique({ where: { id: image.id } });
    assert.ok(deleted?.deletedAt);
  });

  it("deletes a legacy image", async () => {
    const { accessToken, merch, legacy } = await setup();

    const response = await requestApp
      .delete(`manage/merch/${merch.id}/images/${legacy.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(
      await prisma.merchImage.findUnique({ where: { id: legacy.id } }),
      null
    );
  });

  it("404s for an image belonging to other merch", async () => {
    const { accessToken, profile, merch } = await setup();
    const other = await createMerch(profile.id, {});
    const otherImage = await prisma.merchImage.create({
      data: { merchId: other.id, url: [] },
    });

    const response = await requestApp
      .delete(`manage/merch/${merch.id}/images/${otherImage.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 404);
  });
});
