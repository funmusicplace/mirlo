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
      name: "RSS Artist",
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
    assert.match(response.text, /First RSS Track by RSS Artist/);
    assert.match(response.text, /Second RSS Track by RSS Artist/);
    // Track URLs should point at /{artistSlug}/release/{albumSlug}/tracks/{id}
    assert.match(response.text, /\/rss-artist\/release\/rss-album\/tracks\//);
  });

  it("still returns JSON by default (no format=rss)", async () => {
    const { user } = await createUser({ email: "json-tracks@example.com" });
    const artist = await createArtist(user.id, {
      name: "JSON Artist",
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

  it("does not include tracks from unpublished trackGroups in RSS", async () => {
    const { user } = await createUser({
      email: "draft-tracks@example.com",
    });
    const artist = await createArtist(user.id, {
      name: "Draft Artist",
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
