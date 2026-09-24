import assert from "node:assert";

import * as dotenv from "dotenv";
import { describe, it } from "mocha";
dotenv.config();

import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

// Shared by every percentage-floor test below: an artist selling their
// catalogue at 50% of list price, with two releases summing to $30 (floor $15).
async function createArtistWithPercentageCatalogue(
  artistOverrides?: Partial<Parameters<typeof createUser>[0]>
) {
  const { user: artistUser } = await createUser({
    email: "artist@test.com",
    ...artistOverrides,
  });
  const artist = await createArtist(artistUser.id, {
    purchaseEntireCatalogPercentage: 50,
  });
  await createTrackGroup(artist.id, { title: "Album One", minPrice: 1000 });
  await createTrackGroup(artist.id, { title: "Album Two", minPrice: 2000 });
  return artist;
}

describe("GET /v1/artists/{id}/purchaseCatalogue", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("returns 0 when the artist has no purchasable releases or discount configured", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const artist = await createArtist(artistUser.id);

    const response = await requestApp.get(
      `artists/${artist.id}/purchaseCatalogue`
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.price, 0);
  });

  it("defaults to the summed minPrice of the catalogue when no discount is configured", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const artist = await createArtist(artistUser.id);
    await createTrackGroup(artist.id, { title: "Album One", minPrice: 1000 });
    await createTrackGroup(artist.id, { title: "Album Two", minPrice: 2000 });

    const response = await requestApp.get(
      `artists/${artist.id}/purchaseCatalogue`
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.price, 3000);
  });

  it("returns the live percentage-based floor", async () => {
    const artist = await createArtistWithPercentageCatalogue();

    const response = await requestApp.get(
      `artists/${artist.id}/purchaseCatalogue`
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.price, 1500);
  });

  it("returns the flat minPrice when no percentage is set", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const artist = await createArtist(artistUser.id, {
      purchaseEntireCatalogMinPrice: 800,
    });

    const response = await requestApp.get(
      `artists/${artist.id}/purchaseCatalogue`
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.price, 800);
  });

  it("returns 404 for a non-existent artist", async () => {
    const response = await requestApp.get(
      `artists/999999999/purchaseCatalogue`
    );

    assert.equal(response.statusCode, 404);
  });
});
