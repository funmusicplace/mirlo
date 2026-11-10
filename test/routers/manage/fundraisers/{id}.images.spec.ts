import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import sharp from "sharp";
import request from "supertest";

import {
  clearTables,
  createFundraiser,
  createProfile,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

const createFundraiserImage = async (
  fundraiserId: number,
  name: string,
  position: number
) => {
  const image = await prisma.image.create({
    data: { url: [`${name}-x600`, `${name}-x120`], dimensions: "square" },
  });
  const fundraiserImage = await prisma.fundraiserImage.create({
    data: { fundraiserId, imageId: image.id, position },
  });
  return { fundraiserImage, image };
};

const setup = async () => {
  const { user, accessToken } = await createUser({ email: "test@testcom" });
  const profile = await createProfile(user.id);
  const fundraiser = await createFundraiser(profile.id, {
    isAllOrNothing: true,
  });

  const first = await createFundraiserImage(fundraiser.id, "first", 0);
  const second = await createFundraiserImage(fundraiser.id, "second", 1);

  return {
    accessToken,
    profile,
    fundraiser,
    first: first.fundraiserImage,
    second: second.fundraiserImage,
    image: second.image,
  };
};

describe("manage/fundraisers/{fundraiserId}/images", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("returns images in position order with sizes", async () => {
    const { accessToken, fundraiser, first, second } = await setup();

    const response = await requestApp
      .get(`manage/fundraisers/${fundraiser.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    const images = response.body.result.images;
    assert.deepEqual(
      images.map((i: { id: string }) => i.id),
      [first.id, second.id]
    );
    assert.match(images[1].sizes["600"], /mirlo-images/);
  });

  it("uploads an image owned by the fundraiser's artist", async () => {
    const { accessToken, profile, fundraiser } = await setup();
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();

    const response = await requestApp
      .post(`manage/fundraisers/${fundraiser.id}/images`)
      .attach("file", png, "photo.png")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    const image = await prisma.image.findUniqueOrThrow({
      where: { id: response.body.result.imageId },
      include: { fundraiserImage: true },
    });
    assert.equal(image.profileId, profile.id);
    assert.equal(image.fundraiserImage?.fundraiserId, fundraiser.id);
    assert.equal(image.fundraiserImage?.position, 2);
  });

  it("doesn't let other users upload images", async () => {
    const { fundraiser } = await setup();
    const { accessToken } = await createUser({ email: "other@test.com" });

    const response = await requestApp
      .post(`manage/fundraisers/${fundraiser.id}/images`)
      .attach("file", Buffer.from("x"), "photo.png")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.notEqual(response.status, 200);
    assert.equal(await prisma.fundraiserImage.count(), 2);
  });

  it("reorders images", async () => {
    const { accessToken, fundraiser, first, second } = await setup();

    const response = await requestApp
      .put(`manage/fundraisers/${fundraiser.id}/images`)
      .send({ fundraiserImageIds: [second.id, first.id] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.results.map((i: { id: string }) => i.id),
      [second.id, first.id]
    );
  });

  it("rejects a reorder that doesn't list every image", async () => {
    const { accessToken, fundraiser, second } = await setup();

    const response = await requestApp
      .put(`manage/fundraisers/${fundraiser.id}/images`)
      .send({ fundraiserImageIds: [second.id] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 400);
  });

  it("deletes an image and soft-deletes its Image", async () => {
    const { accessToken, fundraiser, second, image } = await setup();

    const response = await requestApp
      .delete(`manage/fundraisers/${fundraiser.id}/images/${second.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(
      await prisma.fundraiserImage.findUnique({ where: { id: second.id } }),
      null
    );
    const deleted = await prisma.image.findUnique({ where: { id: image.id } });
    assert.ok(deleted?.deletedAt);
  });

  it("404s for an image belonging to another fundraiser", async () => {
    const { accessToken, profile, fundraiser } = await setup();
    const other = await createFundraiser(profile.id);
    const { fundraiserImage } = await createFundraiserImage(
      other.id,
      "other",
      0
    );

    const response = await requestApp
      .delete(
        `manage/fundraisers/${fundraiser.id}/images/${fundraiserImage.id}`
      )
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 404);
  });

  it("deletes the images when the fundraiser is deleted", async () => {
    const { accessToken, fundraiser, image } = await setup();

    const response = await requestApp
      .delete(`manage/fundraisers/${fundraiser.id}`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(await prisma.fundraiserImage.count(), 0);
    const deleted = await prisma.image.findUnique({ where: { id: image.id } });
    assert.ok(deleted?.deletedAt);
  });
});
