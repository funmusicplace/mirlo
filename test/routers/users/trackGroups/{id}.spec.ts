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

describe("users/{userId}/trackGroups/{trackGroupId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
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
        .put(`users/${user.id}/trackGroups/${otherTrackGroup.id}`)
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
        .delete(`users/${user.id}/trackGroups/${trackGroup.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      console.log("response", response.body);
    });
  });
});
