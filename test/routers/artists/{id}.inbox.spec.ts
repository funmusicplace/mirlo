import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import { clearTables, createArtist, createUser } from "../../utils";

import { requestApp } from "../utils";

describe("artists/{id]/inbox", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    beforeEach(async () => {
      try {
        await clearTables();
      } catch (e) {
        console.error(e);
      }
    });

    it("should 404 if an artist doesn't exist", async () => {
      const response = await requestApp
        .post(`artists/1/inbox`)
        .set("Accept", "application/activity+json");

      assert.equal(response.status, 404);
      assert.equal(response.body.error, "Artist not found");
    });

    it("should follow an artist", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });
      const response = await requestApp
        .post(`artists/${artist.id}/inbox`)
        .send({
          actor: "https://test-actor.com/remote-actor",
          type: "Follow",
        })
        .set("Accept", "application/activity+json");

      assert.equal(response.statusCode, 200);
    });
  }).timeout(5000);
});
