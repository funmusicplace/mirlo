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

describe("users/{userId}/collection", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should return purchased trackgroups for logged in user", async () => {
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
        .get(`users/${purchaser.id}/collection`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].trackGroupId, trackGroup.id);
      assert.equal(response.body.results[0].trackGroup.artistId, artist.id);
    });

    it("should remove non-public (unpublished) albums from collection", async () => {
      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@testcom",
      });

      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        published: false,
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

      await prisma.userTrackGroupPurchase.create({
        data: {
          trackGroupId: trackGroup.id,
          userId: purchaser.id,
          userTransactionId: transaction.id,
        },
      });

      // Verify the album is removed from the collection when unpublished
      const responseUnpublished = await requestApp
        .get(`users/${purchaser.id}/collection`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(responseUnpublished.statusCode, 200);
      assert.equal(responseUnpublished.body.results.length, 0);
    });

    it("should remove non-public (hidden) albums from collection", async () => {
      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@testcom",
      });

      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        published: true,
        hideFromSearch: true,
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

      await prisma.userTrackGroupPurchase.create({
        data: {
          trackGroupId: trackGroup.id,
          userId: purchaser.id,
          userTransactionId: transaction.id,
        },
      });

      // Verify the album is removed when hidden
      const responseHidden = await requestApp
        .get(`users/${purchaser.id}/collection`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(responseHidden.statusCode, 200);
      assert.equal(responseHidden.body.results.length, 0);
    });

    it("should remove albums with deleted artist from collection", async () => {
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

      // Disable the artist
      await prisma.artist.update({
        where: { id: artist.id },
        data: { enabled: false },
      });

      // Verify the album is removed when artist is disabled
      const responseArtistDisabled = await requestApp
        .get(`users/${purchaser.id}/collection`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(responseArtistDisabled.statusCode, 200);
      assert.equal(responseArtistDisabled.body.results.length, 0);
    });

    it("should allow filtering collection by trackGroupId", async () => {
      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@testcom",
      });

      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup1 = await createTrackGroup(artist.id, {
        title: "Album 1",
      });
      const trackGroup2 = await createTrackGroup(artist.id, {
        title: "Album 2",
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

      await prisma.userTrackGroupPurchase.create({
        data: {
          trackGroupId: trackGroup1.id,
          userId: purchaser.id,
          userTransactionId: transaction.id,
        },
      });

      const transaction2 = await prisma.userTransaction.create({
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
          trackGroupId: trackGroup2.id,
          userId: purchaser.id,
          userTransactionId: transaction2.id,
        },
      });

      // Get filtered by trackGroupId
      const responseFiltered = await requestApp
        .get(`users/${purchaser.id}/collection?trackGroupId=${trackGroup1.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(responseFiltered.statusCode, 200);
      assert.equal(responseFiltered.body.results.length, 1);
      assert.equal(
        responseFiltered.body.results[0].trackGroup.id,
        trackGroup1.id
      );
    });
  });
});
