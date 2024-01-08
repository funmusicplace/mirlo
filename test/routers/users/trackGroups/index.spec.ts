import assert from "node:assert";
import { Prisma } from "@prisma/client";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("users/{userId}/trackGroups", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should GET /", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });

      const response = await requestApp
        .get(`users/${user.id}/trackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.deepEqual(response.body.results, []);
      assert(response.statusCode === 200);
    });

    it("should GET / with one trackGroup", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const response = await requestApp
        .get(`users/${user.id}/trackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].title, trackGroup.title);
      assert(response.statusCode === 200);
    });

    it("should GET / without tracks", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, {
        tracks: [] as Prisma.TrackCreateNestedManyWithoutTrackGroupInput,
      });
      const response = await requestApp
        .get(`users/${user.id}/trackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert(response.statusCode === 200);
    });

    it("should GET / get an unpublished", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, { published: false });
      const response = await requestApp
        .get(`users/${user.id}/trackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert(response.statusCode === 200);
    });

    it("should GET / ordered by release date", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
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
        .get(`users/${user.id}/trackGroups`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results[0].id, mostRecent.id);
      assert.equal(response.body.results[1].id, middle.id);
      assert.equal(response.body.results[2].id, oldest.id);

      assert(response.statusCode === 200);
    });
  });

  describe("POST", () => {
    it("should POST an album successfully", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const response = await requestApp
        .post(`users/${user.id}/trackGroups`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
          urlSlug: "a-title",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.status, 200);
      assert.equal(response.body.result.title, "A title");
      assert.equal(response.body.result.minPrice, 500);
    });

    it("should fail to POST an album without a slug", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const response = await requestApp
        .post(`users/${user.id}/trackGroups`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "Argument `urlSlug` is missing.");
    });

    it("should fail to POST an album when a slug already exists", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .post(`users/${user.id}/trackGroups`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
          urlSlug: trackGroup.urlSlug,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
      assert.equal(
        response.body.error,
        "Can't create a trackGroup with an existing urlSlug"
      );
    });

    it("should POST an album with an empty string title", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      const response = await requestApp
        .post(`users/${user.id}/trackGroups`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "",
          urlSlug: "mi-temp-slug-new-album",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.title, "");
    });

    it("should not POST an album when artistId doesn't belong to user", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });

      const artist = await createArtist(artistUser.id);
      const response = await requestApp
        .post(`users/${user.id}/trackGroups`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "Artist must belong to user");
    });
  });
});
