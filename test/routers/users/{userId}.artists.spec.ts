import assert from "node:assert";

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

describe("users/{userId}/artists", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should return artists for the logged in user", async () => {
      const { user: loggedInUser, accessToken } = await createUser({
        email: "owner@test.com",
      });

      const ownArtist = await createArtist(loggedInUser.id, {
        name: "Owner Artist",
      });
      await createTrackGroup(ownArtist.id, {
        title: "Owner Album",
      });

      const { user: otherUser } = await createUser({
        email: "other@test.com",
      });
      const otherArtist = await createArtist(otherUser.id, {
        name: "Other Artist",
      });
      await createTrackGroup(otherArtist.id, {
        title: "Other Album",
      });

      const response = await requestApp
        .get(`users/${loggedInUser.id}/artists`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].name, "Owner Artist");
      assert.equal(response.body.results[0].trackGroups.length, 1);
      assert.equal(
        response.body.results[0].trackGroups[0].title,
        "Owner Album"
      );
    });

    it("should return 401 when requesting another user's artists", async () => {
      const { user: loggedInUser, accessToken } = await createUser({
        email: "owner@test.com",
      });
      const { user: otherUser } = await createUser({
        email: "other@test.com",
      });

      const response = await requestApp
        .get(`users/${otherUser.id}/artists`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
      assert.equal(response.body.error, "Unauthorized");
      assert.notEqual(loggedInUser.id, otherUser.id);
    });
  });
});
