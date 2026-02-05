import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
  createTrack,
  createUserTrackGroupPurchase,
  createUserTrackPurchase,
} from "../../utils";
import prisma from "@mirlo/prisma";

import { requestApp } from "../utils";

describe("tracks/{id}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/", () => {
    it("should GET / 404", async () => {
      const response = await requestApp
        .get("tracks/1")
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404);
    });

    it("should GET / 200 with description", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const track = await createTrack(trackGroup.id, {
        title: "test track",
        description: "This is a test description",
      });

      const response = await requestApp
        .get("tracks/" + track.id)
        .set("Accept", "application/json");

      assert.equal(
        response.body.result.description,
        "This is a test description"
      );
      assert.equal(response.statusCode, 200);
    });

    it("should GET / 200 with empty description", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const track = await createTrack(trackGroup.id, {
        title: "test track",
      });

      const response = await requestApp
        .get("tracks/" + track.id)
        .set("Accept", "application/json");

      assert.equal(response.body.result.description, null);
      assert.equal(response.statusCode, 200);
    });

    it("should GET / 200 with isPlayable false when user hasn't purchased", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        tracks: [
          {
            title: "Track 1",
            isPreview: false,
            audio: { create: { uploadState: "SUCCESS" } },
          },
        ],
      });
      const tracks = await prisma.track.findMany({
        where: { trackGroupId: trackGroup.id },
      });

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });

      const response = await requestApp
        .get(`tracks/${tracks[0].id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.isPlayable, false);
    });

    it("should GET / 200 with isPlayable true when user purchased trackGroup", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        tracks: [
          {
            title: "Track 1",
            isPreview: false,
            audio: { create: { uploadState: "SUCCESS" } },
          },
        ],
      });
      const tracks = await prisma.track.findMany({
        where: { trackGroupId: trackGroup.id },
      });

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });

      await createUserTrackGroupPurchase(purchaser.id, trackGroup.id);

      const response = await requestApp
        .get(`tracks/${tracks[0].id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.isPlayable, true);
    });

    it("should GET / 200 with isPlayable true when user purchased individual track", async () => {
      const { user } = await createUser({
        email: "artist@artist.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const tracks = await prisma.track.findMany({
        where: { trackGroupId: trackGroup.id },
      });

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@artist.com",
      });

      await createUserTrackPurchase(purchaser.id, tracks[0].id);

      const response = await requestApp
        .get(`tracks/${tracks[0].id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.isPlayable, true);
    });
  });
});
