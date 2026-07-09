import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createArtist, createUser } from "../../../utils";
import { requestApp } from "../../utils";

describe("manage/artists/{artistId}/readers", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should return 401 when not logged in", async () => {
      const response = await requestApp
        .get("manage/artists/1/readers")
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 401);
    });

    it("should return 404 for a user who cannot edit the artist", async () => {
      const { user: artistUser } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_readers_test",
      });
      const { accessToken } = await createUser({ email: "other@test.com" });
      const artist = await createArtist(artistUser.id);

      const response = await requestApp
        .get(`manage/artists/${artist.id}/readers`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404);
    });

    it("should return an empty list when the artist has no connected account", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const artist = await createArtist(user.id);

      const response = await requestApp
        .get(`manage/artists/${artist.id}/readers`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body.results, []);
    });

    it("should list readers from the connected account", async () => {
      // stripe-mock answers terminal.readers.list with a canned reader.
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
        stripeAccountId: "acct_readers_test",
      });
      const artist = await createArtist(user.id);

      const response = await requestApp
        .get(`manage/artists/${artist.id}/readers`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.ok(Array.isArray(response.body.results));
      assert.ok(response.body.results.length > 0);
      const reader = response.body.results[0];
      assert.ok(reader.id, "reader should have an id");
      assert.ok("label" in reader);
      assert.ok("deviceType" in reader);
      assert.ok("status" in reader);
    });
  });
});
