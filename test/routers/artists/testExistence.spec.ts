import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import { clearTables, createProfile, createUser } from "../../utils";

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
      const profile = await createProfile(user.id);

      const response = await request(baseURL)
        .get(`artists/testExistence?urlSlug=${profile.urlSlug}`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      assert.equal(response.body.result.exists, true);
    });

    it("should GET and return false if urlSlug doesn't exist", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const profile = await createProfile(user.id);

      const response = await request(baseURL)
        .get(`artists/testExistence?urlSlug=random-slug`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      assert.equal(response.body.result.exists, false);
    });

    it("should GET and return false if an profileId is supplied", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const profile = await createProfile(user.id);

      const response = await request(baseURL)
        .get(
          `artists/testExistence?urlSlug=${profile.urlSlug}&forArtistId=${profile.id}`
        )
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 200);
      assert.equal(response.body.result.exists, false);
    });
  });
});
