import assert from "node:assert";
import { Prisma } from "@prisma/client";

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
        tracks: [] as Prisma.TrackCreateNestedManyWithoutTrackGroupInput,
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

      assert(response.statusCode === 200);
    });
  });
});
