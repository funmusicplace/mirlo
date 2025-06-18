import assert from "node:assert";
import { Prisma } from "@mirlo/prisma/client";
import prisma from "../../../prisma/prisma";

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

describe("most played tracks", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET /mostPlayed", async () => {
    const response = await requestApp
      .get("tracks/mostPlayed")
      .set("Accept", "json/application");

    assert.deepEqual(response.body.results, []);
    assert(response.statusCode === 200);
  });

  it("should GET /mostPlayed with 1 track", async () => {
    const { user } = await createUser({
      email: "artist@artist.com",
    });
    const artist = await createArtist(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    const track = await createTrack(trackGroup.id, {
      title: "test track",
      description: "This is a test description",
    });
    await createTrackPlay(track.id);

    const response = await requestApp
      .get("tracks/mostPlayed")
      .set("Accept", "json/application");

    assert.equal(response.body.results.length, 1);
    assert(response.statusCode === 200);
  });

  it("should GET /mostPlayed in descending order of TrackPlays", async () => {
    const { user } = await createUser({
      email: "artist@artist.com",
    });
    const { user: user2 } = await createUser({
      email: "artist2@artist.com",
    });

    const artist = await createArtist(user.id, { urlSlug: "artist1" });
    const artist2 = await createArtist(user2.id, { urlSlug: "artist2" });

    const trackGroup = await createTrackGroup(artist.id, {
      urlSlug: "trackGroup1",
    });
    const trackGroup2 = await createTrackGroup(artist2.id, {
      urlSlug: "trackGroup2",
    });

    const mostPlayed = await createTrack(trackGroup.id, {
      title: "most played track",
      description: "most played track description",
    });
    const middlePlayed = await createTrack(trackGroup.id, {
      title: "middle played",
      description: "middle played description",
    });
    const leastPlayed = await createTrack(trackGroup2.id, {
      title: "least played track",
      description: "least played track description",
    });

    for (let i = 0; i < 3; i++) {
      await createTrackPlay(mostPlayed.id);
    }
    for (let i = 0; i < 2; i++) {
      await createTrackPlay(middlePlayed.id);
    }
    for (let i = 0; i < 1; i++) {
      await createTrackPlay(leastPlayed.id);
    }

    const response = await requestApp
      .get("tracks/mostPlayed")
      .set("Accept", "json/application");

    assert.equal(response.body.results.length, 3);
    assert.equal(response.body.results[0].id, mostPlayed.id);
    assert.equal(response.body.results[1].id, middlePlayed.id);
    assert.equal(response.body.results[2].id, leastPlayed.id);
    assert(response.statusCode === 200);
  });

  it("should GET /mostPlayed queried number of tracks in descending order of TrackPlays", async () => {
    const { user } = await createUser({
      email: "artist@artist.com",
    });
    const { user: user2 } = await createUser({
      email: "artist2@artist.com",
    });

    const artist = await createArtist(user.id, { urlSlug: "artist1" });
    const artist2 = await createArtist(user2.id, { urlSlug: "artist2" });

    const trackGroup = await createTrackGroup(artist.id, {
      urlSlug: "trackGroup1",
    });
    const trackGroup2 = await createTrackGroup(artist2.id, {
      urlSlug: "trackGroup2",
    });

    const mostPlayed = await createTrack(trackGroup.id, {
      title: "most played track",
      description: "most played track description",
    });
    const middlePlayed = await createTrack(trackGroup.id, {
      title: "middle played",
      description: "middle played description",
    });
    const leastPlayed = await createTrack(trackGroup2.id, {
      title: "least played track",
      description: "least played track description",
    });

    for (let i = 0; i < 3; i++) {
      await createTrackPlay(mostPlayed.id);
    }
    for (let i = 0; i < 2; i++) {
      await createTrackPlay(middlePlayed.id);
    }
    for (let i = 0; i < 1; i++) {
      await createTrackPlay(leastPlayed.id);
    }

    const response = await requestApp
      .get("tracks/mostPlayed")
      .query("take=2")
      .set("Accept", "json/application");

    assert.equal(response.body.results.length, 2);
    assert.equal(response.body.results[0].id, mostPlayed.id);
    assert.equal(response.body.results[1].id, middlePlayed.id);
    assert(response.statusCode === 200);
  });
});
