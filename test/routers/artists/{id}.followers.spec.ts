import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import { clearTables, createArtist, createUser } from "../../utils";

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
      .get("artists/1/followers")
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

  it("should GET / ActivityPub Followers formatted correctly for no followers", async () => {
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
      .set("Accept", "application/activity+json");

    assert(response.statusCode === 200);
    assert.equal(response.body.type, "OrderedCollection");
    assert.equal(response.body.totalItems, 0);
    assert(response.body.id.includes(`v1/artists/${artist.urlSlug}/followers`));
    assert.equal(response.body.first.type, "OrderedCollectionPage");
    assert.equal(response.body.first.orderedItems.length, 0);
    assert.equal(
      response.body["@context"][0],
      "https://www.w3.org/ns/activitystreams"
    );
  });

  it("should GET / ActivityPub Followers formatted correctly with followers", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test@test.com",
      },
    });
    const artist = await createArtist(user.id, {
      name: "Test artist",
      urlSlug: "test-artist",
      userId: user.id,
      enabled: true,
      subscriptionTiers: {
        create: [
          { name: "Tier 1", isDefaultTier: true },
          { name: "Tier 2", currency: "eur", minAmount: 4 },
        ],
      },
    });

    const { user: followerUser } = await createUser({
      email: "follower@follower.com",
    });

    await prisma.artistUserSubscription.create({
      data: {
        artistSubscriptionTierId: artist.subscriptionTiers![0].id,
        userId: followerUser.id,
        amount: 3,
      },
    });

    const response = await requestApp
      .get(`artists/${artist.id}/followers`)
      .set("Accept", "application/activity+json");

    assert(response.statusCode === 200);
    assert.equal(response.body.totalItems, 1);
    assert.equal(response.body.first.orderedItems.length, 0);
    assert.equal(response.body.first.totalItems, 1);
  });
});
