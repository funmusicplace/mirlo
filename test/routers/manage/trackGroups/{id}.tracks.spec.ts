import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

describe("manage/trackGroups/{id}/tracks", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should PUT / 401 no user", async () => {
    const response = await request(baseURL)
      .put("manage/trackGroups/1/tracks")
      .set("Accept", "application/json")
      .send({ isPreview: true });

    assert.equal(response.statusCode, 401);
  });

  it("should PUT / 404 trackGroup does not belong to user", async () => {
    const { accessToken } = await createUser({ email: "test@test.com" });

    const response = await request(baseURL)
      .put(`manage/trackGroups/1/tracks`)
      .send({ isPreview: true })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should PUT / 400 when isPreview is missing", async () => {
    const { user, accessToken } = await createUser({ email: "test@test.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, {
      urlSlug: "a-title",
    });

    const response = await request(baseURL)
      .put(`manage/trackGroups/${trackGroup.id}/tracks`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);
  });

  it("should bulk set all tracks to must-own (isPreview=false) and update defaultIsPreview", async () => {
    const { user, accessToken } = await createUser({ email: "test@test.com" });
    const artist = await createArtist(user.id);

    const trackGroup = await prisma.trackGroup.create({
      data: {
        artistId: artist.id,
        urlSlug: "test-album",
        title: "Test album",
        publishedAt: new Date(),
        defaultIsPreview: true,
      },
    });

    const track1 = await prisma.track.create({
      data: { trackGroupId: trackGroup.id, order: 0, isPreview: true },
    });
    const track2 = await prisma.track.create({
      data: { trackGroupId: trackGroup.id, order: 1, isPreview: true },
    });

    const response = await request(baseURL)
      .put(`manage/trackGroups/${trackGroup.id}/tracks`)
      .send({ isPreview: false })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.defaultIsPreview, false);

    const refreshed = await prisma.track.findMany({
      where: { trackGroupId: trackGroup.id },
    });
    assert.equal(refreshed.find((t) => t.id === track1.id)?.isPreview, false);
    assert.equal(refreshed.find((t) => t.id === track2.id)?.isPreview, false);
  });

  it("should bulk set all tracks to preview (isPreview=true)", async () => {
    const { user, accessToken } = await createUser({ email: "test@test.com" });
    const artist = await createArtist(user.id);

    const trackGroup = await prisma.trackGroup.create({
      data: {
        artistId: artist.id,
        urlSlug: "test-album",
        title: "Test album",
        publishedAt: new Date(),
        defaultIsPreview: false,
      },
    });
    const track1 = await prisma.track.create({
      data: { trackGroupId: trackGroup.id, order: 0, isPreview: false },
    });

    const response = await request(baseURL)
      .put(`manage/trackGroups/${trackGroup.id}/tracks`)
      .send({ isPreview: true })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.defaultIsPreview, true);

    const refreshed = await prisma.track.findUnique({ where: { id: track1.id } });
    assert.equal(refreshed?.isPreview, true);
  });
});
