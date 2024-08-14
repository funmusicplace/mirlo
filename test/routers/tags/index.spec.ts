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
import prisma from "@mirlo/prisma";

describe("tags", () => {
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
        .get("tags")
        .set("Accept", "application/json");

      assert.deepEqual(response.body.results, []);
      assert.equal(response.statusCode, 200);
    });

    it("should GET / with one tag", async () => {
      // const { user } = await createUser({ email: "test@testcom" });
      // const artist = await createArtist(user.id);
      // const trackGroup = await createTrackGroup(artist.id);
      const tag = await prisma.tag.create({ data: { tag: "test-tag" } });
      const response = await requestApp
        .get("tags")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].tag, tag.tag);
      assert.equal(response.statusCode, 200);
    });

    it("should GET / with tag count", async () => {
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const tg2 = await createTrackGroup(artist.id, { urlSlug: "tg2" });
      const tag = await prisma.tag.create({ data: { tag: "test-tag" } });
      await prisma.trackGroupTag.create({
        data: { tagId: tag.id, trackGroupId: trackGroup.id },
      });
      await prisma.trackGroupTag.create({
        data: { tagId: tag.id, trackGroupId: tg2.id },
      });
      const response = await requestApp
        .get("tags?orderBy=count")
        .set("Accept", "application/json");

      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].tag, tag.tag);
      assert.equal(response.body.results[0].trackGroupsCount, 2);

      assert.equal(response.statusCode, 200);
    });
  });
});
