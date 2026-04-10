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

  describe("Label filtering", () => {
    it("should return non-label artists by default", async () => {
      const user1 = await prisma.user.create({
        data: {
          email: "artist@test.com",
        },
      });
      const user2 = await prisma.user.create({
        data: {
          email: "label@test.com",
        },
      });

      // Create a regular artist with a published track group
      const artist = await createArtist(user1.id, {
        name: "Regular Artist",
        isLabelProfile: false,
      });
      const trackGroup = await createTrackGroup(artist.id);
      await createTrack(trackGroup.id);

      // Create a label with a published track group
      const label = await createArtist(user2.id, {
        name: "My Label",
        isLabelProfile: true,
      });
      const labelTrackGroup = await createTrackGroup(label.id);
      await createTrack(labelTrackGroup.id);

      const response = await request(baseURL)
        .get("artists/")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].name, "Regular Artist");
      assert.equal(response.body.results[0].isLabelProfile, false);
      assert.equal(response.statusCode, 200);
    });

    it("should return only labels when isLabel=true", async () => {
      const user1 = await prisma.user.create({
        data: {
          email: "artist@test.com",
        },
      });
      const user2 = await prisma.user.create({
        data: {
          email: "label@test.com",
        },
      });

      // Create a regular artist with a published track group
      const artist = await createArtist(user1.id, {
        name: "Regular Artist",
        isLabelProfile: false,
      });
      const trackGroup = await createTrackGroup(artist.id);
      await createTrack(trackGroup.id);

      // Create a label with a published track group
      const label = await createArtist(user2.id, {
        name: "My Label",
        isLabelProfile: true,
      });
      const labelTrackGroup = await createTrackGroup(label.id);
      await createTrack(labelTrackGroup.id);

      const response = await request(baseURL)
        .get("artists?isLabel=true")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].name, "My Label");
      assert.equal(response.body.results[0].isLabelProfile, true);
      assert.equal(response.statusCode, 200);
    });

    it("should return non-labels when isLabel=false", async () => {
      const user1 = await prisma.user.create({
        data: {
          email: "artist@test.com",
        },
      });
      const user2 = await prisma.user.create({
        data: {
          email: "label@test.com",
        },
      });

      // Create a regular artist with a published track group
      const artist = await createArtist(user1.id, {
        name: "Regular Artist",
        isLabelProfile: false,
      });
      const trackGroup = await createTrackGroup(artist.id);
      await createTrack(trackGroup.id);

      // Create a label with a published track group
      const label = await createArtist(user2.id, {
        name: "My Label",
        isLabelProfile: true,
      });
      const labelTrackGroup = await createTrackGroup(label.id);
      await createTrack(labelTrackGroup.id);

      const response = await request(baseURL)
        .get("artists?isLabel=false")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].name, "Regular Artist");
      assert.equal(response.body.results[0].isLabelProfile, false);
      assert.equal(response.statusCode, 200);
    });

    it("should filter out labels when querying with isLabel=true if they have no published track groups", async () => {
      const user1 = await prisma.user.create({
        data: {
          email: "label1@test.com",
        },
      });
      const user2 = await prisma.user.create({
        data: {
          email: "label2@test.com",
        },
      });

      // Create a label with a published track group
      const activeLabel = await createArtist(user1.id, {
        name: "Active Label",
        isLabelProfile: true,
      });
      const activeTrackGroup = await createTrackGroup(activeLabel.id);
      await createTrack(activeTrackGroup.id);

      // Create a label WITHOUT any published track groups
      await createArtist(user2.id, {
        name: "Empty Label",
        isLabelProfile: true,
      });

      const response = await request(baseURL)
        .get("artists?isLabel=true")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].name, "Active Label");
      assert.equal(response.statusCode, 200);
    });

    it("should not filter out artists without track groups when includeUnpublished=true", async () => {
      const user1 = await prisma.user.create({
        data: {
          email: "artist@test.com",
        },
      });
      const user2 = await prisma.user.create({
        data: {
          email: "artist2@test.com",
        },
      });

      // Create a regular artist WITHOUT published track groups
      await createArtist(user1.id, {
        name: "Artist Without Tracks",
        isLabelProfile: false,
      });

      // Create a regular artist WITH published track groups
      const artist2 = await createArtist(user2.id, {
        name: "Artist With Tracks",
        isLabelProfile: false,
      });
      const trackGroup2 = await createTrackGroup(artist2.id);
      await createTrack(trackGroup2.id);

      const response = await request(baseURL)
        .get("artists?includeUnpublished=true")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 2);
      assert.equal(response.body.total, 2);
      assert.equal(response.statusCode, 200);
    });

    it("should show multiple labels when all have published track groups", async () => {
      const user1 = await prisma.user.create({
        data: {
          email: "label1@test.com",
        },
      });
      const user2 = await prisma.user.create({
        data: {
          email: "label2@test.com",
        },
      });
      const user3 = await prisma.user.create({
        data: {
          email: "label3@test.com",
        },
      });

      // Create multiple labels with published track groups
      const label1 = await createArtist(user1.id, {
        name: "Label One",
        isLabelProfile: true,
      });
      const tg1 = await createTrackGroup(label1.id);
      await createTrack(tg1.id);

      const label2 = await createArtist(user2.id, {
        name: "Label Two",
        isLabelProfile: true,
      });
      const tg2 = await createTrackGroup(label2.id);
      await createTrack(tg2.id);

      const label3 = await createArtist(user3.id, {
        name: "Label Three",
        isLabelProfile: true,
      });
      const tg3 = await createTrackGroup(label3.id);
      await createTrack(tg3.id);

      const response = await request(baseURL)
        .get("artists?isLabel=true")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 3);
      assert.equal(response.body.total, 3);
      assert.equal(response.statusCode, 200);
    });

    it("should show a label that has a signed artist with published track groups", async () => {
      const labelUser = await prisma.user.create({
        data: {
          email: "label@test.com",
        },
      });
      const signedArtistUser = await prisma.user.create({
        data: {
          email: "signed-artist@test.com",
        },
      });

      // Create the label (label profile)
      const label = await createArtist(labelUser.id, {
        name: "My Label",
        isLabelProfile: true,
      });

      // Create a signed artist under the label
      const signedArtist = await createArtist(signedArtistUser.id, {
        name: "Signed Artist",
      });

      // Create the ArtistLabel relationship
      await prisma.artistLabel.create({
        data: {
          artistId: signedArtist.id,
          labelUserId: labelUser.id,
          isLabelApproved: true,
          isArtistApproved: true,
        },
      });

      // Create published track group for the signed artist
      const trackGroup = await createTrackGroup(signedArtist.id);
      await createTrack(trackGroup.id);

      const response = await request(baseURL)
        .get("artists?isLabel=true")
        .set("Accept", "application/json");

      // The label should appear because it has a signed artist with published track groups
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].name, "My Label");
      assert.equal(response.body.results[0].isLabelProfile, true);
      assert.equal(response.statusCode, 200);
    });

    it("should not show a label that only has signed artists without published track groups", async () => {
      const labelUser = await prisma.user.create({
        data: {
          email: "label@test.com",
        },
      });
      const signedArtistUser = await prisma.user.create({
        data: {
          email: "signed-artist@test.com",
        },
      });

      // Create the label
      const label = await createArtist(labelUser.id, {
        name: "Empty Label",
        isLabelProfile: true,
      });

      // Create a signed artist under the label
      const signedArtist = await createArtist(signedArtistUser.id, {
        name: "Signed Artist",
        isLabelProfile: false,
      });

      // Create the ArtistLabel relationship
      await prisma.artistLabel.create({
        data: {
          artistId: signedArtist.id,
          labelUserId: labelUser.id,
          isLabelApproved: true,
          isArtistApproved: true,
        },
      });

      // NO published track groups created for signed artist

      const response = await request(baseURL)
        .get("artists?isLabel=true")
        .set("Accept", "application/json");

      // The label should NOT appear because it has no published content
      assert.equal(response.body.results.length, 0);
      assert.equal(response.statusCode, 200);
    });
  });
});
