import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import { clearTables, createArtist, createUser } from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/posts", () => {
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

      const artist = await createArtist(user.id);

      const response = await requestApp
        .get(`manage/posts?artistId=${artist.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body.results, []);
    });
  });
});
