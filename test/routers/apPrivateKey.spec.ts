import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

const FAKE_PRIVATE_KEY = "fake-private-key-that-must-not-leak";

/** Recursively checks that no value in an object/array equals the sentinel. */
function containsPrivateKey(value: unknown): boolean {
  if (value === FAKE_PRIVATE_KEY) return true;
  if (Array.isArray(value)) return value.some(containsPrivateKey);
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(
      containsPrivateKey
    );
  }
  return false;
}

async function artistWithPrivateKey(userId: number) {
  const artist = await createArtist(userId);
  await prisma.artist.update({
    where: { id: artist.id },
    data: { apPrivateKey: FAKE_PRIVATE_KEY },
  });
  return artist;
}

describe("apPrivateKey never leaks in API responses", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("GET /artists — public listing", async () => {
    const { user } = await createUser({ email: "artist@test.com" });
    const artist = await artistWithPrivateKey(user.id);
    const trackGroup = await createTrackGroup(artist.id);
    await prisma.track.create({
      data: { trackGroupId: trackGroup.id, order: 1 },
    });

    const response = await requestApp
      .get("artists/")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert(
      !containsPrivateKey(response.body),
      "apPrivateKey found in GET /artists response"
    );
  });

  it("GET /artists/:slug — single artist", async () => {
    const { user } = await createUser({ email: "artist@test.com" });
    const artist = await artistWithPrivateKey(user.id);

    const response = await requestApp
      .get(`artists/${artist.urlSlug}`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert(
      !containsPrivateKey(response.body),
      "apPrivateKey found in GET /artists/:slug response"
    );
  });

  it("GET /trackGroups/:id — nested artist in trackgroup", async () => {
    const { user } = await createUser({ email: "artist@test.com" });
    const artist = await artistWithPrivateKey(user.id);
    const trackGroup = await createTrackGroup(artist.id);

    const response = await requestApp
      .get(`trackGroups/${trackGroup.urlSlug}?artistId=${artist.urlSlug}`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert(
      !containsPrivateKey(response.body),
      "apPrivateKey found in GET /trackGroups/:id response"
    );
  });

  it("GET /admin/purchases — admin endpoint with purchase", async () => {
    const { accessToken } = await createUser({
      email: "admin@test.com",
      isAdmin: true,
    });
    const { user: buyerUser } = await createUser({ email: "buyer@test.com" });
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const artist = await artistWithPrivateKey(artistUser.id);
    const trackGroup = await createTrackGroup(artist.id);

    const transaction = await prisma.userTransaction.create({
      data: {
        userId: buyerUser.id,
        amount: 0,
        currency: "usd",
        platformCut: 0,
        stripeCut: 0,
      },
    });
    await prisma.userTrackGroupPurchase.create({
      data: {
        userId: buyerUser.id,
        trackGroupId: trackGroup.id,
        userTransactionId: transaction.id,
      },
    });

    const response = await requestApp
      .get("admin/purchases")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert(
      !containsPrivateKey(response.body),
      "apPrivateKey found in GET /admin/purchases response"
    );
  });

  it("GET /users/:id/notifications — notifications with artist", async () => {
    const { user, accessToken } = await createUser({
      email: "listener@test.com",
    });
    const { user: artistUser } = await createUser({
      email: "artist@test.com",
    });
    const artist = await artistWithPrivateKey(artistUser.id);

    await prisma.notification.create({
      data: {
        userId: user.id,
        artistId: artist.id,
        notificationType: "NEW_ARTIST_POST",
      },
    });

    const response = await requestApp
      .get(`users/${user.id}/notifications`)
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert(
      !containsPrivateKey(response.body),
      "apPrivateKey found in GET /users/:id/notifications response"
    );
  });
});
