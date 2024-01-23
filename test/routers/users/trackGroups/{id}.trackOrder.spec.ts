import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "../../../../prisma/prisma";
import { clearTables, createArtist, createUser } from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

describe("users/{id}/trackGroups/{id}/trackOrder", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should PUT / 401 no user", async () => {
    const response = await request(baseURL)
      .put("users/1/trackGroups/1/trackOrder")
      .set("Accept", "application/json")
      .send({ trackIds: [] });

    assert.equal(response.statusCode, 401);
  });

  it("should PUT / 404 trackGroup does not belong to user", async () => {
    const { user, accessToken } = await createUser({
      email: "test@test.com",
    });

    const response = await request(baseURL)
      .put(`users/${user.id}/trackGroups/1/trackOrder`)
      .send({ trackIds: [] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should PUT successfully on a trackGroup belong to a user", async () => {
    const { user, accessToken } = await createUser({
      email: "test@test.com",
    });

    const artist = await createArtist(user.id);

    const trackGroup = await prisma.trackGroup.create({
      data: {
        artistId: artist.id,
        urlSlug: "test-album",
        title: "Test album",
        published: true,
      },
    });

    const track1 = await prisma.track.create({
      data: {
        trackGroupId: trackGroup.id,
        order: 0,
      },
    });

    const track2 = await prisma.track.create({
      data: {
        trackGroupId: trackGroup.id,
        order: 1,
      },
    });

    const response = await request(baseURL)
      .put(`users/${user.id}/trackGroups/${trackGroup.id}/trackOrder`)
      .send({ trackIds: [track2.id, track1.id] })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.tracks[0].id, track2.id);
    assert.equal(response.body.result.tracks[0].order, 1);
    assert.equal(response.body.result.tracks[1].id, track1.id);
    assert.equal(response.body.result.tracks[1].order, 2);
  });
});
