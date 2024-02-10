import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import { clearTables, createArtist, createUser } from "../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

describe("artists", () => {
  describe("/testExistence", () => {
    beforeEach(async () => {
      try {
        await clearTables();
      } catch (e) {
        console.error(e);
      }
    });

    it("should GET and return true if urlSlug exists", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);

      const response = await request(baseURL)
        .get(`artists/testExistence?urlSlug=${artist.urlSlug}`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      assert.equal(response.body.result.exists, true);
    });

    it("should GET and return false if urlSlug doesn't exist", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);

      const response = await request(baseURL)
        .get(`artists/testExistence?urlSlug=random-slug`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      assert.equal(response.body.result.exists, false);
    });

    it("should GET and return false if an artistId is supplied", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);

      const response = await request(baseURL)
        .get(
          `artists/testExistence?urlSlug=${artist.urlSlug}&forArtistId=${artist.id}`
        )
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      assert.equal(response.body.result.exists, false);
    });
  });
});
