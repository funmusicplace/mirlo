import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";
import {
  clearTables,
  createProfile,
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
    const profile = await createProfile(user.id);
    const trackGroup = await createTrackGroup(profile.id, {
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
    const profile = await createProfile(user.id);

    // Create track group with defaultIsPreview=false
    const trackGroup = await prisma.trackGroup.create({
      data: {
        title: "Test TrackGroup",
        urlSlug: "test-trackgroup",
        profileId: profile.id,
        publishedAt: new Date(),
        isGettable: true,
        defaultIsPreview: false,
        cover: { create: { url: ["test-url"] } },
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
    const profile = await createProfile(user.id);

    const trackGroup = await prisma.trackGroup.create({
      data: {
        title: "Test TrackGroup",
        urlSlug: "test-trackgroup",
        profileId: profile.id,
        publishedAt: new Date(),
        isGettable: true,
        defaultIsPreview: false,
        cover: { create: { url: ["test-url"] } },
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
});
