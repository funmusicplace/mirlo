import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
  createUser,
  createTrackPlay,
} from "../../utils";
import { requestApp } from "../utils";

describe("register trackPlays", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

    it("should GET / 404", async () => {
      const response = await requestApp
        .get("tracks/1/trackPlay")
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404);
    });

  it("should GET /{id}/trackPlay when not logged in", async () => {
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
      .get("tracks/" + track.id +"/trackPlay")
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
  });

  it("should GET /{id}/trackPlay when logged in", async () => {
    const { user, accessToken } = await createUser({
      email: "artist@artist.com",
    });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const track = await createTrack(trackGroup.id, {
      title: "test track",
      description: "This is a test description",
    });
    
    const response = await requestApp
      .get("tracks/" + track.id +"/trackPlay")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert(response.statusCode === 200);
  });

});
