import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";

import { requestApp } from "../utils";

describe("artists/{id}/supporters", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 404", async () => {
    const response = await requestApp
      .get("artists/1/supporters")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should GET / empty result if artist has no supporters", async () => {
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
  it("should GET / no supporters correctly", async () => {
    const { user } = await createUser({ email: "supporter@test.com" });
    const artist = await createArtist(user.id, {
      name: "Test artist",
      urlSlug: "test-artist",
      userId: user.id,
      enabled: true,
    });

    const response = await requestApp
      .get(`artists/${artist.id}/supporters`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results.length, 0);
    assert.equal(response.body.total, 0);
  });

  it("should GET / a supporter correctly", async () => {
    const { user } = await createUser({ email: "supporter@test.com" });
    const artist = await createArtist(user.id, {
      name: "Test artist",
      urlSlug: "test-artist",
      userId: user.id,
      enabled: true,
    });

    const trackGroup = await createTrackGroup(artist.id, {
      title: "Test track group",
      urlSlug: "test-track-group",
      artistId: artist.id,
    });

    const transaction = await prisma.userTransaction.create({
      data: {
        userId: user.id,
        amount: 1000,
        currency: "usd",
        platformCut: 0,
        stripeCut: 0,
      },
    });

    await prisma.userTrackGroupPurchase.create({
      data: {
        userId: user.id,
        userTransactionId: transaction.id,
        trackGroupId: trackGroup.id,
      },
    });

    const response = await requestApp
      .get(`artists/${artist.id}/supporters`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results.length, 1);
    assert.equal(response.body.total, 1);

    assert.equal(response.body.results[0].amount, 1000);
    assert.equal(
      response.body.results[0].trackGroupPurchases[0].trackGroupId,
      trackGroup.id
    );

    assert.equal(response.body.totalAmount, 1000);
    assert.equal(response.body.totalSupporters, 1);
  });

  it("should GET / multiple supporter sources correctly", async () => {
    const { user } = await createUser({ email: "supporter@test.com" });
    const artist = await createArtist(user.id, {
      name: "Test artist",
      urlSlug: "test-artist",
      userId: user.id,
      enabled: true,
    });

    const trackGroup = await createTrackGroup(artist.id, {
      title: "Test track group",
      urlSlug: "test-track-group",
      artistId: artist.id,
    });

    await prisma.userArtistTip.create({
      data: {
        userId: user.id,
        pricePaid: 3000,
        artistId: artist.id,
      },
    });

    const transaction = await prisma.userTransaction.create({
      data: {
        userId: user.id,
        amount: 1000,
        currency: "usd",
        platformCut: 0,
        stripeCut: 0,
      },
    });

    await prisma.userTrackGroupPurchase.create({
      data: {
        userId: user.id,
        userTransactionId: transaction.id,
        trackGroupId: trackGroup.id,
      },
    });

    const response = await requestApp
      .get(`artists/${artist.id}/supporters`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results.length, 2);
    assert.equal(response.body.total, 2);
    assert.equal(response.body.results[0].amount, 1000);
    assert.equal(response.body.totalAmount, 4000);
    assert.equal(response.body.totalSupporters, 1);
  });
});
