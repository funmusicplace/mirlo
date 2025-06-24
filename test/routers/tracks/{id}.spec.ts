import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
  createTrack
} from "../../utils";

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

      assert.equal(response.body.result.description, "This is a test description");
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
  });
});
