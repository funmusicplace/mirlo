import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";
import { Prisma } from "@mirlo/prisma/client";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/trackGroups/{trackGroupId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("should update defaultIsPreview on a track group", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ artistId: artist.id, defaultIsPreview: false })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.defaultIsPreview, false);
    });

    it("should find a new slug for a trackGroup", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      await createTrackGroup(artist.id, {
        urlSlug: "a-title",
      });
      const otherTrackGroup = await createTrackGroup(artist.id, {
        urlSlug: "mi-temp-slug-album-4",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${otherTrackGroup.id}`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.urlSlug, "a-title-1");
    });
  });

  describe("DELETE", () => {
    it("should delete a track group", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .delete(`manage/trackGroups/${trackGroup.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
    });
  });
});
