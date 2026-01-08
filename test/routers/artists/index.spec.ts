import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";
import {
  clearTables,
  createArtist,
  createTrack,
  createTrackGroup,
} from "../../utils";
import Parser from "rss-parser";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

describe("artists", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });
  describe("/", () => {
    it("should GET / with no artists in database", async () => {
      const response = await request(baseURL)
        .get("artists/")
        .set("Accept", "application/json");

      assert(response.body.results.length === 0);
    });

    it("should GET / with 1 artist in the database", async () => {
      const user = await prisma.user.create({
        data: {
          email: "test@test.com",
        },
      });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id);

      await createTrack(trackGroup.id);

      const response = await request(baseURL)
        .get("artists/")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].trackGroups[0].cover.url.length, 1);
    });

    it("should GET 0 artists with if artist trackgroup doesn't have a cover", async () => {
      const user = await prisma.user.create({
        data: {
          email: "test@test.com",
        },
      });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id, {
        cover: { create: undefined },
      });

      await createTrack(trackGroup.id);

      const response = await request(baseURL)
        .get("artists/")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 0);
    });
  });
  describe("RSS", () => {
    it("should GET / in RSS format", async () => {
      const user = await prisma.user.create({
        data: {
          email: "test@test.com",
        },
      });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id);

      await createTrack(trackGroup.id);

      const response = await request(baseURL).get("artists?format=rss");

      assert(response.statusCode === 200);
      let parser = new Parser();

      const obj = await parser.parseString(response.text);
      assert.equal(
        obj.feedUrl,
        `${process.env.API_DOMAIN}/v1/artists?format=rss`
      );
      assert.equal(obj.title, "All Mirlo Artists Feed");
      assert.equal(obj.items.length, 1);
      assert.equal(obj.items[0].title, `${artist.name}`);
    });
  });
});
