import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import { clearTables } from "../../utils";

import { requestApp } from "../utils";

describe("artists", () => {
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

    it("should GET /{id} with artist slug", async () => {
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
        },
      });
      const response = await requestApp
        .get(`artists/${artistSlug}`)
        .set("Accept", "application/json");

      assert.equal(response.body.result.id, artist.id);
    });

    it("should GET /{id} with wrong artist slug", async () => {
      const artistSlug = "test-artist";
      const user = await prisma.user.create({
        data: {
          email: "test@test.com",
        },
      });
      await prisma.artist.create({
        data: {
          name: "Test artist",
          urlSlug: "other-artist-slug",
          userId: user.id,
          enabled: true,
        },
      });
      const response = await requestApp
        .get(`artists/${artistSlug}`)
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
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
        .get(`artists/${artistSlug}`)
        .set("Accept", "application/activity+json");

      assert.equal(
        response.headers["content-type"],
        "application/activity+json; charset=utf-8"
      );

      assert.equal(response.status, 200);
      assert.equal(response.body.type, "Person");
      assert.equal(response.body.discoverable, true);
      assert.equal(response.body.preferredUsername, artistSlug);
      assert.equal(response.body.name, artist.name);
      assert.equal(response.body.summary, artist.bio);

      assert(
        response.body.followers.includes("/v1/artists/test-artist/followers")
      );
      assert(response.body.publicKey.publicKeyPem);
    }).timeout(5000);

    it("should GET /{id} with application/lb+json", async () => {
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
        .get(`artists/${artistSlug}`)
        .set(
          "Accept",
          `application/ld+json; profile="https://www.w3.org/ns/activitystreams"`
        );

      assert(response.headers["content-type"].includes(`application/ld+json;`));
      assert(
        response.headers["content-type"].includes(
          ' profile="https://www.w3.org/ns/activitystreams"'
        )
      );

      assert.equal(response.status, 200);
      assert.equal(response.body.type, "Person");
      assert.equal(response.body.discoverable, true);
      assert.equal(response.body.preferredUsername, artistSlug);
      assert.equal(response.body.name, artist.name);
      assert.equal(response.body.summary, artist.bio);

      assert(
        response.body.followers.includes("/v1/artists/test-artist/followers")
      );
      assert(response.body.publicKey.publicKeyPem);
    });
  });
});
