import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import { clearTables, createArtist, createUser } from "../../../utils";
import { requestApp } from "../../utils";

describe("manage/artists/{artistId} purchaseEntireCatalogPercentage", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("rejects a percentage outside 0-100", async () => {
    const { user, accessToken } = await createUser({
      email: "artist@test.com",
    });
    const artist = await createArtist(user.id);

    const response = await requestApp
      .put(`manage/artists/${artist.id}`)
      .send({ purchaseEntireCatalogPercentage: 150 })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);
  });

  it("persists a valid percentage and lets it be cleared back to null", async () => {
    const { user, accessToken } = await createUser({
      email: "artist@test.com",
    });
    const artist = await createArtist(user.id);

    const response = await requestApp
      .put(`manage/artists/${artist.id}`)
      .send({ purchaseEntireCatalogPercentage: 60 })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    const updated = await prisma.profile.findFirst({
      where: { id: artist.id },
    });
    assert.equal(updated?.purchaseEntireCatalogPercentage, 60);

    const clearResponse = await requestApp
      .put(`manage/artists/${artist.id}`)
      .send({ purchaseEntireCatalogPercentage: null })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(clearResponse.statusCode, 200);
    const cleared = await prisma.profile.findFirst({
      where: { id: artist.id },
    });
    assert.equal(cleared?.purchaseEntireCatalogPercentage, null);
  });
});
