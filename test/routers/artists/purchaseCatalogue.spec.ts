import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();

import prisma from "@mirlo/prisma";
import { describe, it } from "mocha";

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

  it("returns null when the artist doesn't offer entire-catalogue purchases", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const artist = await createArtist(artistUser.id);

    const response = await requestApp.get(
      `artists/${artist.id}/purchaseCatalogue`
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.price, null);
  });

  it("returns the live percentage-based floor", async () => {
    const artist = await createArtistWithPercentageCatalogue();
    await prisma.profile.update({
      where: { id: artist.id },
      data: { allowPurchaseEntireCatalog: true },
    });

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
      allowPurchaseEntireCatalog: true,
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

describe("POST /v1/artists/{id}/purchaseCatalogue", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("rejects a price below the percentage-based floor", async () => {
    const artist = await createArtistWithPercentageCatalogue();
    const { accessToken } = await createUser({ email: "buyer@test.com" });

    // Floor is 50% of (1000 + 2000) = 1500
    const response = await requestApp
      .post(`artists/${artist.id}/purchaseCatalogue`)
      .send({ price: "1000" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);
  });

  it("accepts a price at or above the percentage-based floor", async () => {
    const artist = await createArtistWithPercentageCatalogue({
      stripeAccountId: "acct_catalogue_percentage",
    });
    const { accessToken } = await createUser({ email: "buyer@test.com" });

    // Floor is 1500; buyer chooses to pay more than the floor
    const response = await requestApp
      .post(`artists/${artist.id}/purchaseCatalogue`)
      .send({ price: "2000" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.ok(response.body.redirectUrl);
  });

  it("returns 404 for a non-existent artist", async () => {
    const { accessToken } = await createUser({ email: "buyer@test.com" });

    const response = await requestApp
      .post(`artists/999999999/purchaseCatalogue`)
      .send({ price: "1000" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("rejects a paid purchase when the artist has no payment processor connected", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { accessToken } = await createUser({ email: "buyer@test.com" });
    const artist = await createArtist(artistUser.id, {
      purchaseEntireCatalogMinPrice: 500,
    });

    const response = await requestApp
      .post(`artists/${artist.id}/purchaseCatalogue`)
      .send({ price: "1000" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);
    assert.match(response.body.error, /payment processor/i);
  });

  it("rejects a logged-in buyer trying to get the catalogue for free", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const { accessToken } = await createUser({ email: "buyer@test.com" });
    // No purchaseEntireCatalogMinPrice/percentage set, so the floor is 0.
    const artist = await createArtist(artistUser.id);

    const response = await requestApp
      .post(`artists/${artist.id}/purchaseCatalogue`)
      .send({})
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 400);
    assert.match(response.body.error, /for free/i);
  });

  it("subscribes the logged-in buyer to the artist as a side effect of purchasing", async () => {
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
      stripeAccountId: "acct_catalogue_follow",
    });
    const { user: buyer, accessToken } = await createUser({
      email: "buyer@test.com",
    });
    const artist = await createArtist(artistUser.id, {
      purchaseEntireCatalogMinPrice: 500,
    });

    const response = await requestApp
      .post(`artists/${artist.id}/purchaseCatalogue`)
      .send({ price: "500" })
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);

    const subscription = await prisma.profileUserSubscription.findFirst({
      where: {
        userId: buyer.id,
        profileSubscriptionTier: { profileId: artist.id },
      },
    });
    assert.ok(subscription, "buyer should be subscribed to the artist");
  });
});
