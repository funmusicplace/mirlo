import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
  createTrackPlay,
  createUser,
  createUserTrackGroupPurchase,
} from "../../utils";

import { requestApp } from "../utils";
import Parser from "rss-parser";
import { faker } from "@faker-js/faker";

describe("most played trackGroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET /mostPlayed", async () => {
    const response = await requestApp
      .get("trackGroups/mostPlayed")
      .set("Accept", "application/json");

    assert.deepEqual(response.body.results, []);
    assert(response.statusCode === 200);
  });

  it("should GET /mostPlayed with 1 trackGroup", async () => {
    const { user } = await createUser({ email: "test@test.com" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const track = await createTrack(trackGroup.id);

    await createTrackPlay(track.id);

    const response = await requestApp
      .get("trackGroups/mostPlayed")
      .set("Accept", "application/json");

    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].title, trackGroup.title);
    assert(response.statusCode === 200);
  });

  it("should GET /mostPlayed not get without tracks", async () => {
    const { user } = await createUser({ email: "test@testcom" });
    const artist = await createArtist(user.id);
    await createTrackGroup(artist.id, {
      tracks: [],
    });
    const response = await requestApp
      .get("trackGroups/mostPlayed")
      .set("Accept", "application/json");

    assert.equal(response.body.results.length, 0);
    assert(response.statusCode === 200);
  });

  it("should GET /mostPlayed not get an unpublished", async () => {
    const { user } = await createUser({ email: "test@testcom" });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id, { published: false });
    const track = await createTrack(trackGroup.id);
    await createTrackPlay(track.id);
    const response = await requestApp
      .get("trackGroups/mostPlayed")
      .set("Accept", "application/json");

    assert.equal(response.body.results, 0);
    assert(response.statusCode === 200);
  });

  it("should GET /mostPlayed in descending order of number total plays across all tracks", async () => {
    const { user: user1 } = await createUser({ email: "test@test.com" });
    const { user: user2 } = await createUser({ email: "test1@test.com" });
    const artist1 = await createArtist(user1.id);
    const artist2 = await createArtist(user2.id, { urlSlug: "artist-2" });

    const mostPlayed = await createTrackGroup(artist1.id, {
      title: "most-played",
      urlSlug: "most-played",
    });
    const middlePlayed = await createTrackGroup(artist2.id, {
      title: "middle played",
      urlSlug: "middle-played",
    });
    const leastPlayed = await createTrackGroup(artist1.id, {
      title: "third played",
      urlSlug: "third-played",
    });

    const track1 = await createTrack(mostPlayed.id);
    const track2 = await createTrack(mostPlayed.id);

    const track3 = await createTrack(middlePlayed.id);

    const track4 = await createTrack(leastPlayed.id);

    for (let i = 0; i < 3; i++) {
      await createTrackPlay(track1.id);
      await createTrackPlay(track2.id);
    }

    for (let i = 0; i < 4; i++) {
      await createTrackPlay(track3.id);
    }

    for (let i = 0; i < 1; i++) {
      await createTrackPlay(track4.id);
    }

    const response = await requestApp
      .get("trackGroups/mostPlayed")
      .set("Accept", "application/json");

    assert.equal(response.body.results.length, 3);
    assert.equal(response.body.results[0].id, mostPlayed.id);
    assert.equal(response.body.results[1].id, middlePlayed.id);
    assert.equal(response.body.results[2].id, leastPlayed.id);

    assert(response.statusCode === 200);
  });

  it("should GET /mostPlayed queried number in descending order of number total plays across all tracks", async () => {
    const { user: user1 } = await createUser({ email: "test@test.com" });
    const { user: user2 } = await createUser({ email: "test1@test.com" });
    const artist1 = await createArtist(user1.id);
    const artist2 = await createArtist(user2.id, { urlSlug: "artist-2" });

    const mostPlayed = await createTrackGroup(artist1.id, {
      title: "most-played",
      urlSlug: "most-played",
    });
    const middlePlayed = await createTrackGroup(artist2.id, {
      title: "middle played",
      urlSlug: "middle-played",
    });
    const leastPlayed = await createTrackGroup(artist1.id, {
      title: "third played",
      urlSlug: "third-played",
    });

    const track1 = await createTrack(mostPlayed.id);
    const track2 = await createTrack(mostPlayed.id);

    const track3 = await createTrack(middlePlayed.id);

    const track4 = await createTrack(leastPlayed.id);

    for (let i = 0; i < 3; i++) {
      await createTrackPlay(track1.id);
      await createTrackPlay(track2.id);
    }

    for (let i = 0; i < 4; i++) {
      await createTrackPlay(track3.id);
    }

    for (let i = 0; i < 1; i++) {
      await createTrackPlay(track4.id);
    }

    const response = await requestApp
      .get("trackGroups/mostPlayed")
      .query("take=2")
      .set("Accept", "application/json");

    assert.equal(response.body.results.length, 2);
    assert.equal(response.body.results[0].id, mostPlayed.id);
    assert.equal(response.body.results[1].id, middlePlayed.id);

    assert(response.statusCode === 200);
  });
});
