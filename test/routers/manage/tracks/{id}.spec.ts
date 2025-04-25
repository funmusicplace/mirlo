import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach } from "mocha";
import { clearTables, createTrack, createTrackGroup, createUser, createArtist } from "../../../utils";
import { requestApp } from "../../utils";

describe("PUT /manage/tracks/{id}", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("should update the description of a track", async () => {
    const { user, accessToken } = await createUser({
      email: "artist@artist.com",
    });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const track = await createTrack(trackGroup.id, {
      title: "test track",
      description: "test description",
    });

    const response = await requestApp
      .put(`manage/tracks/${track.id}`)
      .send({ title: "test track", description: "Updated description" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.body.result.description, "Updated description");
    assert.equal(response.statusCode, 200);
  });
});