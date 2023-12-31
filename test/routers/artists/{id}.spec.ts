import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "../../../prisma/prisma";
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
  });
});
