import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("flag", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST /", () => {
    it("should store a user report for a release", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .post("flag")
        .send({
          email: "reporter@test.com",
          reason: "inappropriateContent",
          description: "Not ok",
          trackGroupId: trackGroup.id,
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const flags = await prisma.contentFlag.findMany();
      assert.equal(flags.length, 1);
      assert.equal(flags[0].source, "USER_REPORT");
      assert.equal(flags[0].reason, "inappropriateContent");
      assert.equal(flags[0].description, "Not ok");
      assert.equal(flags[0].reporterEmail, "reporter@test.com");
      assert.equal(flags[0].trackGroupId, trackGroup.id);
      assert.equal(flags[0].profileId, artist.id);
      assert.equal(flags[0].resolvedAt, null);
    });

    it("should return 400 for a non numeric release id", async () => {
      const response = await requestApp
        .post("flag")
        .send({
          email: "reporter@test.com",
          reason: "copyrightViolation",
          description: "Not theirs",
          trackGroupId: "not-a-number",
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      assert.equal((await prisma.contentFlag.findMany()).length, 0);
    });

    it("should return 400 without a release id", async () => {
      const response = await requestApp
        .post("flag")
        .send({
          email: "reporter@test.com",
          reason: "copyrightViolation",
          description: "Not theirs",
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      assert.equal((await prisma.contentFlag.findMany()).length, 0);
    });

    it("should return 400 for an unknown reason", async () => {
      const { user } = await createUser({ email: "artist@artist.com" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .post("flag")
        .send({
          email: "reporter@test.com",
          reason: "somethingElse",
          description: "Not theirs",
          trackGroupId: trackGroup.id,
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      assert.equal((await prisma.contentFlag.findMany()).length, 0);
    });

    it("should return 400 for an unknown release", async () => {
      const response = await requestApp
        .post("flag")
        .send({
          email: "reporter@test.com",
          reason: "copyrightViolation",
          description: "Not theirs",
          trackGroupId: 99999,
        })
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);

      const flags = await prisma.contentFlag.findMany();
      assert.equal(flags.length, 0);
    });
  });
});
