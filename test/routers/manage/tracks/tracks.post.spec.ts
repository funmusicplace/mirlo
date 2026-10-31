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
const requestApp = request(baseURL);

describe("manage/tracks POST", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should inherit defaultIsPreview=true from track group when isPreview not specified", async () => {
    const { user, accessToken } = await createUser({ email: "test@testcom" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, {
      tracks: [],
    });

    const response = await requestApp
      .post("manage/tracks")
      .send({ trackGroupId: trackGroup.id, title: "Test Track" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.result.isPreview, true);
  });

  it("should inherit defaultIsPreview=false from track group when isPreview not specified", async () => {
    const { user, accessToken } = await createUser({ email: "test@testcom" });
    const artist = await createArtist(user.id);

    // Create track group with defaultIsPreview=false
    const trackGroup = await prisma.trackGroup.create({
      data: {
        title: "Test TrackGroup",
        urlSlug: "test-trackgroup",
        profile: { connect: { id: artist.id } },
        publishedAt: new Date(),
        isGettable: true,
        defaultIsPreview: false,
        cover: { create: { url: ["test-url"], dimensions: "artwork" } },
      },
    });

    const response = await requestApp
      .post("manage/tracks")
      .send({ trackGroupId: trackGroup.id, title: "Test Track" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.result.isPreview, false);
  });

  it("should use explicit isPreview value over track group default", async () => {
    const { user, accessToken } = await createUser({ email: "test@testcom" });
    const artist = await createArtist(user.id);

    const trackGroup = await prisma.trackGroup.create({
      data: {
        title: "Test TrackGroup",
        urlSlug: "test-trackgroup",
        profile: { connect: { id: artist.id } },
        publishedAt: new Date(),
        isGettable: true,
        defaultIsPreview: false,
        cover: { create: { url: ["test-url"], dimensions: "artwork" } },
      },
    });

    // Explicit isPreview=true overrides defaultIsPreview=false
    const response = await requestApp
      .post("manage/tracks")
      .send({
        trackGroupId: trackGroup.id,
        title: "Test Track",
        isPreview: true,
      })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.result.isPreview, true);
  });

  it("should only store a track artist's own fields, not nested writes", async () => {
    const { user, accessToken } = await createUser({ email: "test@testcom" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, {
      tracks: [],
    });

    const response = await requestApp
      .post("manage/tracks")
      .send({
        trackGroupId: trackGroup.id,
        title: "Test Track",
        trackArtists: [
          {
            artistName: "Guest",
            role: "vocals",
            isCoAuthor: true,
            order: 1,
            artist: {
              create: {
                name: "Evil",
                urlSlug: "evil",
                user: {
                  create: { email: "evil@test.com", isAdmin: true },
                },
              },
            },
          },
        ],
      })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(
      await prisma.user.count({ where: { email: "evil@test.com" } }),
      0
    );
    const trackArtist = await prisma.trackArtist.findFirst({
      where: { trackId: response.body.result.id },
    });
    assert.equal(trackArtist?.artistName, "Guest");
    assert.equal(trackArtist?.role, "vocals");
    assert.equal(trackArtist?.isCoAuthor, true);
    assert.equal(trackArtist?.artistId, null);
  });
});
