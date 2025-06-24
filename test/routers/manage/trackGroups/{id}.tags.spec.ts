import assert from "node:assert";
import { Prisma } from "@mirlo/prisma/client";

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
import prisma from "@mirlo/prisma";
import { isEmpty, xor } from "lodash";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/trackGroups/{trackGroupId}/tags", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("should set tags on a trackGroup", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tagArray = ["a tag", "zanother tag"];
      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/tags`)
        .send(tagArray)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 2);

      const addedTags = await prisma.trackGroupTag.findMany({
        where: {
          trackGroupId: trackGroup.id,
        },
        include: {
          tag: true,
        },
        orderBy: {
          tag: {
            tag: "asc",
          },
        },
      });
      assert.deepEqual(
        addedTags.map((tgt) => tgt.tag.tag),
        tagArray
      );
    });

    it("should assume tags with commas in them are separate tags", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "a-title",
      });

      const tagArray = [
        "a tag",
        "zanother tag",
        "tag with, a comma",
        "tag with, another comma",
      ];

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/tags`)
        .send(tagArray)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 5);

      const addedTags = await prisma.trackGroupTag.findMany({
        where: {
          trackGroupId: trackGroup.id,
        },
        include: {
          tag: true,
        },
        orderBy: {
          tag: {
            tag: "asc",
          },
        },
      });

      assert(
        isEmpty(
          xor(
            addedTags.map((tgt) => tgt.tag.tag),
            ["a tag", "zanother tag", "tag with", "a comma", "another comma"]
          )
        )
      );
    });

    it("should update tags on a trackGroup if existing tags", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tagArray = ["a tag", "zanother tag"];
      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "a-title",
      });

      const existingTag = await prisma.tag.create({
        data: {
          tag: "an old tag",
        },
      });

      await prisma.trackGroupTag.create({
        data: {
          trackGroupId: trackGroup.id,
          tagId: existingTag.id,
        },
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/tags`)
        .send(tagArray)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 2);
      const addedTags = await prisma.trackGroupTag.findMany({
        where: {
          trackGroupId: trackGroup.id,
        },
        include: {
          tag: true,
        },
        orderBy: {
          tag: {
            tag: "asc",
          },
        },
      });
      assert.deepEqual(
        addedTags.map((tgt) => tgt.tag.tag),
        tagArray
      );
    });
  });
});
