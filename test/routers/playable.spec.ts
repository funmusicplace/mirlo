import assert from "node:assert";
import prisma from "@mirlo/prisma";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
  createUser,
} from "../utils";

import { requestApp } from "./utils";

describe("playable", () => {
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
        .get("playable")
        .set("Accept", "application/json");

      assert.deepEqual(response.body.results, []);
      assert(response.statusCode === 200);
    });

    it("should return id of a playable track", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tg = await createTrackGroup(artist.id, {
        title: "most recent",
      });

      const track = await createTrack(tg.id, {
        isPreview: true,
      });

      const response = await requestApp
        .get("playable")
        .query(`trackIds[]=${track.id}`)
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0], track.id);

      assert(response.statusCode === 200);
    });

    it("should return id of a playable track if owned artist", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tg = await createTrackGroup(artist.id, {
        title: "most recent",
      });

      const track = await createTrack(tg.id, {
        isPreview: false,
      });

      const response = await requestApp
        .get("playable")
        .query(`trackIds[]=${track.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0], track.id);

      assert(response.statusCode === 200);
    });

    it("should not return id of a non-preview track if not purchased by user", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tg = await createTrackGroup(artist.id, {
        title: "most recent",
      });

      const track = await createTrack(tg.id, {
        isPreview: false,
      });

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@test.com",
      });

      const response = await requestApp
        .get("playable")
        .query(`trackIds[]=${track.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 0);

      assert(response.statusCode === 200);
    });

    it("should return id of a non-preview track if trackgroup purchased by user", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tg = await createTrackGroup(artist.id, {
        title: "most recent",
      });

      const track = await createTrack(tg.id, {
        isPreview: false,
      });

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@test.com",
      });

      await prisma.userTrackGroupPurchase.create({
        data: {
          userId: purchaser.id,
          trackGroupId: tg.id,
          pricePaid: 0,
        },
      });

      const response = await requestApp
        .get("playable")
        .query(`trackIds[]=${track.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0], track.id);

      assert(response.statusCode === 200);
    });

    it("should return id of a non-preview track if track purchased by user", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tg = await createTrackGroup(artist.id, {
        title: "most recent",
      });

      const track = await createTrack(tg.id, {
        isPreview: false,
      });

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@test.com",
      });

      await prisma.userTrackPurchase.create({
        data: {
          userId: purchaser.id,
          trackId: track.id,
          pricePaid: 0,
        },
      });

      const response = await requestApp
        .get("playable")
        .query(`trackIds[]=${track.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0], track.id);

      assert(response.statusCode === 200);
    });

    it("should only return id of a non-preview track if track purchased by user", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tg = await createTrackGroup(artist.id, {
        title: "most recent",
      });

      const track = await createTrack(tg.id, {
        isPreview: false,
      });
      const track2 = await createTrack(tg.id, {
        isPreview: false,
      });

      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@test.com",
      });

      await prisma.userTrackPurchase.create({
        data: {
          userId: purchaser.id,
          trackId: track.id,
          pricePaid: 0,
        },
      });

      const response = await requestApp
        .get("playable")
        .query(`trackIds[]=${track.id}&trackIds[]=${track2.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0], track.id);

      assert(response.statusCode === 200);
    });
  });
});
