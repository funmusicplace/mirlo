import assert from "node:assert";
import { Prisma } from "@mirlo/prisma/client";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";

import { requestApp } from "../utils";

describe("trackGroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should GET /", async () => {
      const response = await requestApp
        .get("trackGroups")
        .set("Accept", "application/json");

      assert.deepEqual(response.body.results, []);
      assert(response.statusCode === 200);
    });

    it("should GET / with one trackGroup", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const response = await requestApp
        .get("trackGroups")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].title, trackGroup.title);
      assert(response.statusCode === 200);
    });

    it("should GET / not get without tracks", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, {
        tracks: [],
      });
      const response = await requestApp
        .get("trackGroups")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 0);
      assert(response.statusCode === 200);
    });

    it("should GET / not get an unpublished", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, { published: false });
      const response = await requestApp
        .get("trackGroups")
        .set("Accept", "application/json");

      assert.equal(response.body.results, 0);
      assert(response.statusCode === 200);
    });

    it("should GET / ordered by release date", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const mostRecent = await createTrackGroup(artist.id, {
        title: "most recent",
        releaseDate: "2024-11-28T12:52:08.206Z",
      });
      const middle = await createTrackGroup(artist.id, {
        title: "middle",
        urlSlug: "a-second-album",
        releaseDate: "2023-11-28T12:52:08.206Z",
      });
      const oldest = await createTrackGroup(artist.id, {
        title: "oldest",
        urlSlug: "a-oldest-album",
        releaseDate: "2022-11-28T12:52:08.206Z",
      });
      const response = await requestApp
        .get("trackGroups")
        .set("Accept", "application/json");

      assert.equal(response.body.results[0].id, mostRecent.id);
      assert.equal(response.body.results[1].id, middle.id);
      assert.equal(response.body.results[2].id, oldest.id);
      assert.equal(response.body.total, 3);

      assert(response.statusCode === 200);
    });

    it("should limit to one by artist on distinctArtists", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, {
        title: "most recent",
      });
      await createTrackGroup(artist.id, {
        title: "middle",
        urlSlug: "a-second-album",
      });
      await createTrackGroup(artist.id, {
        title: "oldest",
        urlSlug: "a-oldest-album",
      });
      const response = await requestApp
        .get("trackGroups")
        .query("distinctArtists=true")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.total, undefined);

      assert(response.statusCode === 200);
    });

    it("should exclude trackgroups that don't match the string", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, {
        title: "most recent",
      });
      const tg = await createTrackGroup(artist.id, {
        title: "middle",
        urlSlug: "a-second-album",
      });
      await createTrackGroup(artist.id, {
        title: "oldest",
        urlSlug: "a-oldest-album",
      });
      const response = await requestApp
        .get("trackGroups")
        .query("title=mi")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.total, 1);
      assert.equal(response.body.results[0].id, tg.id);

      assert(response.statusCode === 200);
    });

    it("should only return albums filtered by artistId", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tg = await createTrackGroup(artist.id, {
        title: "most recent",
      });

      const artist2 = await createArtist(user.id, { urlSlug: "asdfasdf" });
      await createTrackGroup(artist2.id, {
        title: "most recent",
      });

      const response = await requestApp
        .get("trackGroups")
        .query(`artistId=${artist.id}`)
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.total, 1);
      assert.equal(response.body.results[0].id, tg.id);

      assert(response.statusCode === 200);
    });
  });
});
