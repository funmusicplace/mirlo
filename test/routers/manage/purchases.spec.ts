import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it, beforeEach } from "mocha";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createUser,
  createArtist,
  createMerch,
  createArtistLabel,
} from "../../utils";
import { requestApp } from "../utils";

describe("manage/purchases", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET /", () => {
    it("should return 401 if not authenticated", async () => {
      const response = await requestApp
        .get("manage/purchases")
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 401);
    });

    it("should return purchases for artists owned by the user", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const buyer = await createUser({
        email: "buyer@test.com",
        password: "super-secret-password",
      });

      const artist = await createArtist(user.id);
      const merch = await createMerch(artist.id);

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: buyer.user.id,
          amount: 1500,
          currency: "usd",
        },
      });

      await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get("manage/purchases")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].user.email, "buyer@test.com");
      assert.equal(response.body.results[0].user.id, buyer.user.id);
      assert.equal(response.body.results[0].user.password, undefined);
      assert.equal(
        response.body.results[0].user.emailConfirmationToken,
        undefined
      );
      assert.equal(
        response.body.results[0].user.passwordResetConfirmationToken,
        undefined
      );
    });

    it("should not return purchases for artists not owned or managed by the user", async () => {
      const owner = await createUser({ email: "owner@test.com" });
      const attacker = await createUser({ email: "attacker@test.com" });
      const buyer = await createUser({
        email: "buyer@test.com",
        password: "super-secret-password",
      });

      const artist = await createArtist(owner.user.id);
      const merch = await createMerch(artist.id);

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: buyer.user.id,
          amount: 1500,
          currency: "usd",
        },
      });

      await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get(`manage/purchases?artistIds=${artist.id}`)
        .set("Cookie", [`jwt=${attacker.accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 0);
      assert.equal(response.body.total, 0);
    });

    it("should not return purchases for artists a user can manage but doesn't own when artist ids are not provided", async () => {
      const label = await createUser({
        email: "label@test.com",
        isLabelAccount: true,
      });
      const owner = await createUser({ email: "owner@test.com" });
      const buyer = await createUser({ email: "buyer@test.com" });

      const artist = await createArtist(owner.user.id);
      await createArtistLabel({
        artistId: artist.id,
        labelUserId: label.user.id,
        canLabelManageArtist: true,
        isLabelApproved: true,
        isArtistApproved: true,
      });

      const merch = await createMerch(artist.id);
      const transaction = await prisma.userTransaction.create({
        data: {
          userId: buyer.user.id,
          amount: 900,
          currency: "usd",
        },
      });

      await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get("manage/purchases")
        .set("Cookie", [`jwt=${label.accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 0);
    });

    it("should return purchases for artists a user can manage but doesn't own when artist ids are provided", async () => {
      const label = await createUser({
        email: "label@test.com",
        isLabelAccount: true,
      });
      const owner = await createUser({ email: "owner@test.com" });
      const buyer = await createUser({ email: "buyer@test.com" });

      const artist = await createArtist(owner.user.id);
      await createArtistLabel({
        artistId: artist.id,
        labelUserId: label.user.id,
        canLabelManageArtist: true,
        isLabelApproved: true,
        isArtistApproved: true,
      });

      const merch = await createMerch(artist.id);
      const transaction = await prisma.userTransaction.create({
        data: {
          userId: buyer.user.id,
          amount: 900,
          currency: "usd",
        },
      });

      await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get(`manage/purchases?artistIds=${artist.id}`)
        .set("Cookie", [`jwt=${label.accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].user.email, "buyer@test.com");
      assert.equal(response.body.results[0].user.password, undefined);
    });
  });

  describe("GET /:purchaseId", () => {
    it("should not leak buyer secrets on a single purchase", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@test.com",
      });
      const buyer = await createUser({
        email: "buyer@test.com",
        password: "super-secret-password",
      });

      const artist = await createArtist(user.id);
      const merch = await createMerch(artist.id);

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: buyer.user.id,
          amount: 1500,
          currency: "usd",
        },
      });

      const purchase = await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get(`manage/purchases/${purchase.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.user.email, "buyer@test.com");
      assert.equal(response.body.result.user.password, undefined);
      assert.equal(response.body.result.user.emailConfirmationToken, undefined);
    });

    it("should 404 for another artist's purchase", async () => {
      const owner = await createUser({ email: "owner@test.com" });
      const attacker = await createUser({ email: "attacker@test.com" });
      const buyer = await createUser({ email: "buyer@test.com" });

      const artist = await createArtist(owner.user.id);
      const merch = await createMerch(artist.id);

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: buyer.user.id,
          amount: 1500,
          currency: "usd",
        },
      });

      const purchase = await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: buyer.user.id,
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          transactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get(`manage/purchases/${purchase.id}`)
        .set("Cookie", [`jwt=${attacker.accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });
  });
});
