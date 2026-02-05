import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import prisma from "@mirlo/prisma";

import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createMerch,
  createTrackGroup,
  createUser,
} from "../../utils";

import { requestApp } from "../utils";
import { faker } from "@faker-js/faker";

describe("users/{userId}/purchases", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should return all purchases for logged in user", async () => {
      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@testcom",
      });

      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const merch = await createMerch(artist.id);

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: purchaser.id,
          amount: 10,
          currency: "usd",
          platformCut: 0,
          stripeCut: 0,
          createdAt: faker.date.between({
            from: "2022-01-01T00:00:00.000Z",
            to: "2023-01-01T00:00:00.000Z",
          }),
        },
      });

      await prisma.userTrackGroupPurchase.create({
        data: {
          trackGroupId: trackGroup.id,
          userId: purchaser.id,
          userTransactionId: transaction.id,
          createdAt: transaction.createdAt,
        },
      });

      const merchTransaction = await prisma.userTransaction.create({
        data: {
          userId: purchaser.id,
          amount: 10,
          currency: "usd",
          platformCut: 0,
          stripeCut: 0,
          createdAt: faker.date.between({
            from: "2020-01-01T00:00:00.000Z",
            to: "2021-01-01T00:00:00.000Z",
          }),
        },
      });

      await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: purchaser.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: merchTransaction.id,
          createdAt: merchTransaction.createdAt,
        },
      });

      const response = await requestApp
        .get(`users/${purchaser.id}/purchases`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      assert.equal(response.body.results[1].userId, purchaser.id);
      assert.equal(
        response.body.results[1].merchPurchases[0].merchId,
        merch.id
      );
      assert.equal(
        response.body.results[1].merchPurchases[0].merch.artistId,
        artist.id
      );
      assert.equal(response.body.results[1].trackGroupPurchases.length, 0);

      assert.equal(response.body.results[0].userId, purchaser.id);
      assert.equal(
        response.body.results[0].trackGroupPurchases[0].trackGroupId,
        trackGroup.id
      );
      assert.equal(
        response.body.results[0].trackGroupPurchases[0].trackGroup.artistId,
        artist.id
      );
      assert.equal(response.body.results[0].merchPurchases.length, 0);
    });

    it("should return isPlayable true for purchased trackGroups", async () => {
      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@testcom",
      });

      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: purchaser.id,
          amount: 10,
          currency: "usd",
          platformCut: 0,
          stripeCut: 0,
        },
      });

      await prisma.userTrackGroupPurchase.create({
        data: {
          trackGroupId: trackGroup.id,
          userId: purchaser.id,
          userTransactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get(`users/${purchaser.id}/purchases`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].trackGroupPurchases.length, 1);

      const purchasedTrackGroup =
        response.body.results[0].trackGroupPurchases[0].trackGroup;
      assert.equal(purchasedTrackGroup.tracks.length, 1);
      assert.equal(purchasedTrackGroup.tracks[0].isPlayable, true);
    });

    it("should return isPlayable true for purchased individual tracks", async () => {
      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@testcom",
      });

      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        tracks: [
          { title: "Track 1", audio: { create: { uploadState: "SUCCESS" } } },
          {
            title: "Track 2",
            isPreview: false,
            audio: { create: { uploadState: "SUCCESS" } },
          },
        ],
      });

      const tracks = await prisma.track.findMany({
        where: { trackGroupId: trackGroup.id },
        orderBy: { order: "asc" },
      });

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: purchaser.id,
          amount: 10,
          currency: "usd",
          platformCut: 0,
          stripeCut: 0,
        },
      });

      // Purchase only the first track
      await prisma.userTrackPurchase.create({
        data: {
          trackId: tracks[0].id,
          userId: purchaser.id,
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get(`users/${purchaser.id}/purchases`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].trackPurchases.length, 1);

      const purchasedTrack = response.body.results[0].trackPurchases[0].track;
      assert.equal(purchasedTrack.isPlayable, true);
    });
  });
});
