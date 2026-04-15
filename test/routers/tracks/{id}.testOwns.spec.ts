import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
  createUser,
  createUserTrackGroupPurchase,
} from "../../utils";
import { requestApp } from "../utils";

describe("tracks/{id}/testOwns", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should return exists=true when user has a direct track purchase", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        publishedAt: new Date(),
        tracks: [],
      });
      const track = await createTrack(trackGroup.id);

      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });
      await prisma.userTrackPurchase.create({
        data: { userId: purchaser.id, trackId: track.id },
      });

      const response = await requestApp
        .get(`tracks/${track.id}/testOwns?email=${purchaser.email}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.exists, true);
    });

    it("should return exists=true for isPreview track when user has purchased the album", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        publishedAt: new Date(),
        tracks: [],
      });
      const track = await createTrack(trackGroup.id, { isPreview: true });

      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });
      await createUserTrackGroupPurchase(purchaser.id, trackGroup.id);

      const response = await requestApp
        .get(`tracks/${track.id}/testOwns?email=${purchaser.email}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.exists, true);
    });

    it("should return exists=false for non-preview track when user only has album purchase", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        publishedAt: new Date(),
        tracks: [],
      });
      const track = await createTrack(trackGroup.id, { isPreview: false });

      const { user: purchaser } = await createUser({
        email: "purchaser@artist.com",
      });
      await createUserTrackGroupPurchase(purchaser.id, trackGroup.id);

      const response = await requestApp
        .get(`tracks/${track.id}/testOwns?email=${purchaser.email}`)
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.exists, false);
    });
  });
});
