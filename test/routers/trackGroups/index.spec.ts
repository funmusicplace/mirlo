import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import Parser from "rss-parser";

import {
  clearTables,
  createProfile,
  createTrackGroup,
  createUser,
  createUserTrackGroupPurchase,
} from "../../utils";

import prisma from "@mirlo/prisma";

import { requestApp } from "../utils";

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
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);
      const response = await requestApp
        .get("trackGroups")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].title, trackGroup.title);
      assert(response.statusCode === 200);
    });

    it("should GET / get without tracks", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      await createTrackGroup(profile.id, {
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
      const profile = await createProfile(user.id);
      await createTrackGroup(profile.id, { publishedAt: null });
      const response = await requestApp
        .get("trackGroups")
        .set("Accept", "application/json");

      assert.equal(response.body.results, 0);
      assert(response.statusCode === 200);
    });

    it("should GET / not return private trackGroups", async () => {
      const { user } = await createUser({ email: "private@test.com" });
      const profile = await createProfile(user.id);
      await createTrackGroup(profile.id, { isPublic: false });

      const response = await requestApp
        .get("trackGroups")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 0);
      assert(response.statusCode === 200);
    });

    it("should GET / excludes trackGroups from soft-deleted artists", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      await createTrackGroup(profile.id, { title: "Super Hyper Galaxy" });
      await prisma.profile.delete({ where: { id: profile.id } });

      const response = await requestApp
        .get("trackGroups?title=super")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 0);
      assert(response.statusCode === 200);
    });

    it("should GET / excludes trackGroups from disabled artists", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id, { enabled: false });
      await createTrackGroup(profile.id, { title: "Super Hyper Galaxy" });

      const response = await requestApp
        .get("trackGroups?title=super")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 0);
      assert(response.statusCode === 200);
    });

    it("should GET / excludes trackGroups whose artist user cannot create artists", async () => {
      const { user } = await createUser({
        email: "test@testcom",
        canCreateArtists: false,
      });
      const profile = await createProfile(user.id);
      await createTrackGroup(profile.id, { title: "Super Hyper Galaxy" });

      const response = await requestApp
        .get("trackGroups?title=super")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 0);
      assert(response.statusCode === 200);
    });

    it("should GET / ordered by release date", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const mostRecent = await createTrackGroup(profile.id, {
        title: "most recent",
        releaseDate: "2024-11-28T12:52:08.206Z",
      });
      const middle = await createTrackGroup(profile.id, {
        title: "middle",
        urlSlug: "a-second-album",
        releaseDate: "2023-11-28T12:52:08.206Z",
      });
      const oldest = await createTrackGroup(profile.id, {
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
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id, {
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
      const profile = await createProfile(user.id);
      const trackGroup = await createTrackGroup(profile.id);

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
      const profile = await createProfile(user.id);
      await createTrackGroup(profile.id, {
        title: "most recent",
      });
      await createTrackGroup(profile.id, {
        title: "middle",
        urlSlug: "a-second-album",
      });
      await createTrackGroup(profile.id, {
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
      const profile = await createProfile(user.id);
      await createTrackGroup(profile.id, {
        title: "most recent",
      });
      const tg = await createTrackGroup(profile.id, {
        title: "middle",
        urlSlug: "a-second-album",
      });
      await createTrackGroup(profile.id, {
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

    it("should match q against the title", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id, { name: "Robin" });
      const tg = await createTrackGroup(profile.id, { title: "The Bird Album" });
      await createTrackGroup(profile.id, {
        title: "words",
        urlSlug: "words",
      });

      const response = await requestApp
        .get("trackGroups")
        .query("q=bird")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].id, tg.id);
      assert(response.statusCode === 200);
    });

    it("should match q against the artist name", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id, { name: "Blackbird" });
      const tg = await createTrackGroup(profile.id, { title: "words" });
      const otherProfile = await createProfile(user.id, {
        name: "Crow",
        urlSlug: "crow",
      });
      await createTrackGroup(otherProfile.id, {
        title: "CROW ATTACK",
        urlSlug: "crow-attack",
      });

      const response = await requestApp
        .get("trackGroups")
        .query("q=blackbird")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].id, tg.id);
      assert(response.statusCode === 200);
    });

    it("should match q across multiple tokens (artist + title)", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id, { name: "Robin" });
      const target = await createTrackGroup(profile.id, {
        title: "The Bird Album",
      });
      await createTrackGroup(profile.id, {
        title: "words",
        urlSlug: "robin-words",
      });
      const otherProfile = await createProfile(user.id, {
        name: "Crow",
        urlSlug: "crow",
      });
      await createTrackGroup(otherProfile.id, {
        title: "The Bird Album",
        urlSlug: "crow-the-bird-album",
      });

      const response = await requestApp
        .get("trackGroups")
        .query("q=robin bird")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].id, target.id);
      assert(response.statusCode === 200);
    });

    it("q should be case insensitive", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id, { name: "Blackbird" });
      const tg = await createTrackGroup(profile.id, { title: "The Bird Album" });

      const response = await requestApp
        .get("trackGroups")
        .query("q=BIRD")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].id, tg.id);
      assert(response.statusCode === 200);
    });

    it("q should still exclude non-published trackGroups", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id, { name: "Crow" });
      await createTrackGroup(profile.id, {
        title: "CROW ATTACK",
        publishedAt: null,
      });

      const response = await requestApp
        .get("trackGroups")
        .query("q=crow attack")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 0);
      assert(response.statusCode === 200);
    });

    it("should only return albums filtered by profileId", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const tg = await createTrackGroup(profile.id, {
        title: "most recent",
      });

      const profile2 = await createProfile(user.id, { urlSlug: "asdfasdf" });
      await createTrackGroup(profile2.id, {
        title: "most recent",
      });

      const response = await requestApp
        .get("trackGroups")
        .query(`profileId=${profile.id}`)
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
      const profile = await createProfile(user.id);
      await createTrackGroup(profile.id, { publishedAt: null });
      const response = await requestApp
        .get("trackGroups?format=rss")
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      let parser = new Parser();

      const obj = await parser.parseString(response.text);

      assert.ok(obj.feedUrl?.includes(`/v1/trackGroups?format=rss`));
      assert.equal(obj.title, "All Mirlo Releases Feed");
      assert.equal(obj.items.length, 0);
    });

    it("should display an published album in an RSS feed", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const releaseDate = faker.date.past();
      const tg = await createTrackGroup(profile.id, {
        publishedAt: new Date(),
        isHiddenTrackGroupForSongDrafts: false,
        releaseDate,
      });
      const response = await requestApp
        .get("trackGroups?format=rss")
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      let parser = new Parser();

      const obj = await parser.parseString(response.text);

      assert.ok(obj.feedUrl?.includes(`/v1/trackGroups?format=rss`));
      assert.equal(obj.items.length, 1);
      assert.equal(obj.items[0].title, `${tg.title} by ${profile.name}`);
    });

    it("should display an published album in an RSS feed when filtering by isReleased ", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const releaseDate = faker.date.past();
      const tg = await createTrackGroup(profile.id, {
        publishedAt: new Date(),
        isHiddenTrackGroupForSongDrafts: false,
        releaseDate,
      });
      const response = await requestApp
        .get("trackGroups?format=rss&isReleased=released")
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      let parser = new Parser();

      const obj = await parser.parseString(response.text);

      assert.ok(obj.feedUrl?.includes(`/v1/trackGroups?format=rss`));
      assert.equal(obj.items.length, 1);
      assert.equal(obj.items[0].title, `${tg.title} by ${profile.name}`);
    });

    it("should not display a published album with a future releasedate in an RSS feed when filtering by isReleased ", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const releaseDate = faker.date.future();
      const tg = await createTrackGroup(profile.id, {
        publishedAt: new Date(),
        isHiddenTrackGroupForSongDrafts: false,
        releaseDate,
      });
      const response = await requestApp
        .get("trackGroups?format=rss&isReleased=released")
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      let parser = new Parser();

      const obj = await parser.parseString(response.text);

      assert.ok(obj.feedUrl?.includes(`/v1/trackGroups?format=rss`));
      assert.equal(obj.items.length, 0);
    });

    it("should display a published album with a future releasedate in an RSS feed when filtering by isReleased=not-released", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const profile = await createProfile(user.id);
      const releaseDate = faker.date.future();
      const tg = await createTrackGroup(profile.id, {
        publishedAt: new Date(),
        isHiddenTrackGroupForSongDrafts: false,
        releaseDate,
      });
      const response = await requestApp
        .get("trackGroups?format=rss&isReleased=not-released")
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      let parser = new Parser();

      const obj = await parser.parseString(response.text);

      assert.ok(obj.feedUrl?.includes(`/v1/trackGroups?format=rss`));
      assert.equal(obj.title, "All Mirlo Releases Feed");
      assert.equal(obj.items.length, 1);
      assert.equal(obj.items[0].title, `${tg.title} by ${profile.name}`);
    });
  });
});
