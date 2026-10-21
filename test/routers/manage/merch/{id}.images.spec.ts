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

  const createMerchImage = async (name: string, position: number) => {
    const image = await prisma.image.create({
      data: { url: [`${name}-x600`, `${name}-x120`], dimensions: "square" },
    });
    const merchImage = await prisma.merchImage.create({
      data: { merchId: merch.id, imageId: image.id, position },
    });
    return { merchImage, image };
  };
  const first = await createMerchImage("first", 0);
  const second = await createMerchImage("second", 1);

  return {
    accessToken,
    profile,
    merch,
    first: first.merchImage,
    second: second.merchImage,
    image: second.image,
  };
};

describe("manage/merch/{merchId}/images", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("serializes images in position order with sizes from the images bucket root", async () => {
    const { accessToken, merch, first, second } = await setup();

    const response = await requestApp
      .get(`manage/merch/${merch.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    const images = response.body.result.images;
    assert.deepEqual(
      images.map((i: { id: string }) => i.id),
      [first.id, second.id]
    );
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
    const { accessToken, merch, first, second } = await setup();

    const response = await requestApp
      .put(`manage/merch/${merch.id}/images`)
      .send({ merchImageIds: [second.id, first.id] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.results.map((i: { id: string }) => i.id),
      [second.id, first.id]
    );
  });

  it("rejects a reorder that doesn't list every image", async () => {
    const { accessToken, merch, second } = await setup();

    const response = await requestApp
      .put(`manage/merch/${merch.id}/images`)
      .send({ merchImageIds: [second.id] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 400);
  });

  it("deletes an image and soft-deletes its Image", async () => {
    const { accessToken, merch, second, image } = await setup();

    const response = await requestApp
      .delete(`manage/merch/${merch.id}/images/${second.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(
      await prisma.merchImage.findUnique({ where: { id: second.id } }),
      null
    );
    const deleted = await prisma.image.findUnique({ where: { id: image.id } });
    assert.ok(deleted?.deletedAt);
  });

  it("404s for an image belonging to other merch", async () => {
    const { accessToken, profile, merch } = await setup();
    const other = await createMerch(profile.id, {});
    const image = await prisma.image.create({
      data: { url: [], dimensions: "square" },
    });
    const otherImage = await prisma.merchImage.create({
      data: { merchId: other.id, imageId: image.id },
    });

    const response = await requestApp
      .delete(`manage/merch/${merch.id}/images/${otherImage.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 404);
  });
});
