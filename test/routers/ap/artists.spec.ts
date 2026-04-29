import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables } from "../../utils";
import { requestApp } from "../utils";

describe("ap/artists", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/{id}", () => {
    beforeEach(async () => {
      try {
        await clearTables();
      } catch (e) {
        console.error(e);
      }
    });

    it("should GET /{id} with as ActivityPub Actor", async () => {
      const artistSlug = "test-artist";
      const user = await prisma.user.create({
        data: {
          email: "test@test.com",
        },
      });
      const artist = await prisma.artist.create({
        data: {
          name: "Test artist",
          urlSlug: artistSlug,
          userId: user.id,
          enabled: true,
          activityPub: true,
          bio: "a test bio",
        },
      });
      const response = await requestApp
        .get(`ap/artists/${artistSlug}`)
        .set("Accept", "application/activity+json");

      assert.equal(
        response.headers["content-type"],
        "application/activity+json"
      );

      assert.equal(response.status, 200);
      assert.equal(response.body.type, "Person");
      assert.equal(response.body.discoverable, true);
      assert.equal(response.body.preferredUsername, artistSlug);
      assert.equal(response.body.name, artist.name);
      assert.equal(response.body.summary, artist.bio);

      assert(
        response.body.followers.includes("/v1/ap/artists/test-artist/followers")
      );
      assert(response.body.publicKey.publicKeyPem);
    }).timeout(5000);
  });
});
