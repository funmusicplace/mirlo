import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
  createUserTrackGroupPurchase,
} from "../../utils";
import prisma from "@mirlo/prisma";

import { requestApp } from "../utils";
import Parser from "rss-parser";
import { faker } from "@faker-js/faker";

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

    it("should GET / get without tracks", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, {
        tracks: [],
      });
      const response = await requestApp
        .get("trackGroups")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
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

    it("should GET / with isPlayable false when user hasn't purchased", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        tracks: [
          {
            title: "Track 1",
            isPreview: false,
            audio: { create: { uploadState: "SUCCESS" } },
          },
        ],
      });

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@testcom",
      });

      const response = await requestApp
        .get("trackGroups")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].tracks.length, 1);
      assert.equal(response.body.results[0].tracks[0].isPlayable, false);
      assert(response.statusCode === 200);
    });

    it("should GET / with isPlayable true when user has purchased", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@testcom",
      });

      await createUserTrackGroupPurchase(purchaser.id, trackGroup.id);

      const response = await requestApp
        .get("trackGroups")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].tracks.length, 1);
      assert.equal(response.body.results[0].tracks[0].isPlayable, true);
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

  describe("RSS", () => {
    it("should not display an unpublished album in an RSS feed", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, { published: false });
      const response = await requestApp
        .get("trackGroups?format=rss")
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      let parser = new Parser();

      const obj = await parser.parseString(response.text);

      assert.equal(
        obj.feedUrl,
        `${process.env.API_DOMAIN}/v1/trackGroups?format=rss`
      );
      assert.equal(obj.title, "All Mirlo Releases Feed");
      assert.equal(obj.items.length, 0);
    });

    it("should display an published album in an RSS feed", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const releaseDate = faker.date.past();
      const tg = await createTrackGroup(artist.id, {
        published: true,
        isDrafts: false,
        releaseDate,
      });
      const response = await requestApp
        .get("trackGroups?format=rss")
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      let parser = new Parser();

      const obj = await parser.parseString(response.text);

      assert.equal(
        obj.feedUrl,
        `${process.env.API_DOMAIN}/v1/trackGroups?format=rss`
      );
      assert.equal(obj.items.length, 1);
      assert.equal(obj.items[0].title, `${tg.title} by ${artist.name}`);
    });

    it("should display an published album in an RSS feed when filtering by isReleased ", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const releaseDate = faker.date.past();
      const tg = await createTrackGroup(artist.id, {
        published: true,
        isDrafts: false,
        releaseDate,
      });
      const response = await requestApp
        .get("trackGroups?format=rss&isReleased=released")
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      let parser = new Parser();

      const obj = await parser.parseString(response.text);

      assert.equal(
        obj.feedUrl,
        `${process.env.API_DOMAIN}/v1/trackGroups?format=rss`
      );
      assert.equal(obj.items.length, 1);
      assert.equal(obj.items[0].title, `${tg.title} by ${artist.name}`);
    });

    it("should not display a published album with a future releasedate in an RSS feed when filtering by isReleased ", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const releaseDate = faker.date.future();
      const tg = await createTrackGroup(artist.id, {
        published: true,
        isDrafts: false,
        releaseDate,
      });
      const response = await requestApp
        .get("trackGroups?format=rss&isReleased=released")
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      let parser = new Parser();

      const obj = await parser.parseString(response.text);

      assert.equal(
        obj.feedUrl,
        `${process.env.API_DOMAIN}/v1/trackGroups?format=rss`
      );
      assert.equal(obj.items.length, 0);
    });

    it("should display a published album with a future releasedate in an RSS feed when filtering by isReleased=not-released", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const releaseDate = faker.date.future();
      const tg = await createTrackGroup(artist.id, {
        published: true,
        isDrafts: false,
        releaseDate,
      });
      const response = await requestApp
        .get("trackGroups?format=rss&isReleased=not-released")
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      let parser = new Parser();

      const obj = await parser.parseString(response.text);

      assert.equal(
        obj.feedUrl,
        `${process.env.API_DOMAIN}/v1/trackGroups?format=rss`
      );
      assert.equal(obj.title, "All Mirlo Releases Feed");
      assert.equal(obj.items.length, 1);
      assert.equal(obj.items[0].title, `${tg.title} by ${artist.name}`);
    });
  });
});
