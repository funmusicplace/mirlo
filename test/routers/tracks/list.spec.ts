import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

describe("GET /v1/tracks", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("returns RSS XML when format=rss is requested (#1099)", async () => {
    const { user } = await createUser({ email: "rss-tracks@example.com" });
    const artist = await createArtist(user.id, {
      name: "RSS Profile",
      urlSlug: "rss-artist",
    });
    await createTrackGroup(artist.id, {
      title: "RSS Album",
      urlSlug: "rss-album",
      tracks: [
        {
          title: "First RSS Track",
          audio: { create: { uploadState: "SUCCESS" } },
        },
        {
          title: "Second RSS Track",
          audio: { create: { uploadState: "SUCCESS" } },
        },
      ],
    });

    const response = await requestApp.get("tracks").query({ format: "rss" });

    assert.equal(response.status, 200);
    assert.match(
      response.headers["content-type"] ?? "",
      /^application\/rss\+xml/i
    );
    assert.match(response.text, /<rss/);
    assert.match(response.text, /All Mirlo Tracks Feed/);
    assert.match(response.text, /First RSS Track by RSS Profile/);
    assert.match(response.text, /Second RSS Track by RSS Profile/);
    // Track URLs should point at /{artistSlug}/release/{albumSlug}/tracks/{id}
    assert.match(response.text, /\/rss-artist\/release\/rss-album\/tracks\//);
  });

  it("still returns JSON by default (no format=rss)", async () => {
    const { user } = await createUser({ email: "json-tracks@example.com" });
    const artist = await createArtist(user.id, {
      name: "JSON Profile",
      urlSlug: "json-artist",
    });
    await createTrackGroup(artist.id, {
      title: "JSON Album",
      urlSlug: "json-album",
      tracks: [
        {
          title: "JSON Track",
          audio: { create: { uploadState: "SUCCESS" } },
        },
      ],
    });

    const response = await requestApp
      .get("tracks")
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert(Array.isArray(response.body.results));
    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].title, "JSON Track");
  });

  it("q matches against the track title", async () => {
    const { user } = await createUser({ email: "q-title@example.com" });
    const artist = await createArtist(user.id, {
      name: "Robin",
      urlSlug: "robin",
    });
    await createTrackGroup(artist.id, {
      title: "The Bird Album",
      urlSlug: "the-bird-album",
      tracks: [
        {
          title: "Chirp",
          audio: { create: { uploadState: "SUCCESS" } },
        },
        {
          title: "Quiet Forest",
          audio: { create: { uploadState: "SUCCESS" } },
        },
      ],
    });

    const response = await requestApp
      .get("tracks")
      .query({ q: "chirp" })
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].title, "Chirp");
  });

  it("q matches against the artist name", async () => {
    const { user } = await createUser({ email: "q-artist@example.com" });
    const artist = await createArtist(user.id, {
      name: "Blackbird",
      urlSlug: "blackbird",
    });
    await createTrackGroup(artist.id, {
      title: "Migration",
      urlSlug: "migration",
      tracks: [
        {
          title: "Wing Beats",
          audio: { create: { uploadState: "SUCCESS" } },
        },
      ],
    });
    const otherUser = await createUser({ email: "q-other@example.com" });
    const otherArtist = await createArtist(otherUser.user.id, {
      name: "Crow",
      urlSlug: "crow",
    });
    await createTrackGroup(otherArtist.id, {
      title: "Stars",
      urlSlug: "stars",
      tracks: [
        {
          title: "Kaaw",
          audio: { create: { uploadState: "SUCCESS" } },
        },
      ],
    });

    const response = await requestApp
      .get("tracks")
      .query({ q: "blackbird" })
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].title, "Wing Beats");
  });

  it("q matches across multiple tokens (artist + title)", async () => {
    const { user } = await createUser({ email: "q-multi@example.com" });
    const artist = await createArtist(user.id, {
      name: "Blackbird",
      urlSlug: "blackbird-multi",
    });
    await createTrackGroup(artist.id, {
      title: "Migration",
      urlSlug: "migration-multi",
      tracks: [
        {
          title: "Chirp",
          audio: { create: { uploadState: "SUCCESS" } },
        },
        {
          title: "Kaaw",
          audio: { create: { uploadState: "SUCCESS" } },
        },
      ],
    });

    const response = await requestApp
      .get("tracks")
      .query({ q: "blackbird chirp" })
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].title, "Chirp");
  });

  it("q is case insensitive", async () => {
    const { user } = await createUser({ email: "q-case@example.com" });
    const artist = await createArtist(user.id, {
      name: "Robin",
      urlSlug: "robin-case",
    });
    await createTrackGroup(artist.id, {
      title: "The Bird Album",
      urlSlug: "the-bird-album-case",
      tracks: [
        {
          title: "Migration",
          audio: { create: { uploadState: "SUCCESS" } },
        },
      ],
    });

    const response = await requestApp
      .get("tracks")
      .query({ q: "MIGRATION" })
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.results[0].title, "Migration");
  });

  it("q excludes tracks from unpublished trackGroups", async () => {
    const { user } = await createUser({ email: "q-unpub@example.com" });
    const artist = await createArtist(user.id, {
      name: "Crow",
      urlSlug: "crow-unpub",
    });
    await createTrackGroup(artist.id, {
      title: "Hidden Album",
      urlSlug: "hidden-album",
      publishedAt: null,
      tracks: [
        {
          title: "Hidden Chirp",
          audio: { create: { uploadState: "SUCCESS" } },
        },
      ],
    });

    const response = await requestApp
      .get("tracks")
      .query({ q: "hidden" })
      .set("Accept", "application/json");

    assert.equal(response.status, 200);
    assert.equal(response.body.results.length, 0);
  });

  it("does not include tracks from unpublished trackGroups in RSS", async () => {
    const { user } = await createUser({
      email: "draft-tracks@example.com",
    });
    const artist = await createArtist(user.id, {
      name: "Draft Profile",
      urlSlug: "draft-artist",
    });
    await createTrackGroup(artist.id, {
      title: "Draft Album",
      urlSlug: "draft-album",
      publishedAt: null,
      tracks: [
        {
          title: "Hidden Track",
          audio: { create: { uploadState: "SUCCESS" } },
        },
      ],
    });

    const response = await requestApp.get("tracks").query({ format: "rss" });

    assert.equal(response.status, 200);
    assert.doesNotMatch(response.text, /Hidden Track/);
  });
});
