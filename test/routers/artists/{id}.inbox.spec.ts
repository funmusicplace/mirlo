import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import { clearTables, createArtist, createUser } from "../../utils";
import prisma from "@mirlo/prisma";

import { requestApp } from "../utils";

describe("artists/{id}/inbox", () => {
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
        .set("content-type", "application/activity+json");

      assert.equal(response.status, 404);
      assert.equal(response.body.error, "Artist not found, must use urlSlug");
    });

    it("should throw a 400 if not right format", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });

      const response = await requestApp
        .post(`artists/${artist.urlSlug}/inbox`)
        .send({
          actor: "https://test-actor.com/remote-actor",
          type: "Follow",
        })
        .set("content-type", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should throw a 400 if type is not set", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });

      const response = await requestApp
        .post(`artists/${artist.urlSlug}/inbox`)
        .send({
          actor: "https://test-actor.com/remote-actor",
        })
        .set("content-type", "application/json");

      assert.equal(response.statusCode, 400);
    });

    it("should throw a 501 not implemented if type is not Follow", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });

      const response = await requestApp
        .post(`artists/${artist.urlSlug}/inbox`)
        .send({
          actor: "https://test-actor.com/remote-actor",
          type: "Create",
        })
        .set("content-type", "application/activity+json");

      assert.equal(response.statusCode, 501);
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
        .post(`artists/${artist.urlSlug}/inbox`)
        .send({
          actor: "https://test-actor.com/remote-actor",
          type: "Follow",
        })
        .set("content-type", "application/activity+json");

      const result = await prisma.activityPubArtistFollowers.findFirst({
        where: {
          artistId: artist.id,
        },
      });

      assert.equal(response.statusCode, 200);
    }).timeout(5000);
  });
});
