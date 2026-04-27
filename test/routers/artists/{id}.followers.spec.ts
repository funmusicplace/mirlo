import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables } from "../../utils";
import { requestApp } from "../utils";

describe("artists/{id}/followers", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 404", async () => {
    const response = await requestApp
      .get("artists/nonexistent-slug/followers")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should GET / empty result if artist has no followers", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@test.com",
      },
    });
    const artist = await prisma.artist.create({
      data: {
        name: "Test artist",
        urlSlug: "test-artist",
        userId: user.id,
        enabled: true,
      },
    });

    const response = await requestApp
      .get(`artists/${artist.id}/followers`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert(response.body.result === 0);
  });
});
