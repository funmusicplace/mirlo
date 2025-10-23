import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";
import prisma from "@mirlo/prisma";
import { faker } from "@faker-js/faker";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

const requestApp = request(baseURL);

describe("admin/purchases", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("/", () => {
    it("should GET / 401 without user", async () => {
      const response = await requestApp
        .get("admin/purchases")
        .set("Accept", "application/json");

      assert(response.statusCode === 401);
    });
    it("should GET / 401 without admin", async () => {
      const { accessToken } = await createUser({
        email: "artist@artist.com",
      });
      const response = await requestApp
        .get("admin/purchases")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 401);
    });

    it("should GET / 200 with admin", async () => {
      const { user: artistUser, accessToken } = await createUser({
        email: "artist@artist.com",
        isAdmin: true,
      });

      const { user } = await createUser({
        email: "purchasesr@purchaser.com",
      });

      const artist = await createArtist(artistUser.id);

      const trackGroup = await createTrackGroup(artist.id);

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: user.id,
          amount: 0,
          currency: "usd",
          platformCut: 0,
          stripeCut: 0,
        },
      });
      await prisma.userTrackGroupPurchase.create({
        data: {
          userId: user.id,
          trackGroupId: trackGroup.id,
          userTransactionId: transaction.id,
        },
      });

      const response = await requestApp
        .get("admin/purchases")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      assert.equal(response.body.results.length, 1);
    });

    it("should GET / datePurchased filter", async () => {
      const { user: artistUser, accessToken } = await createUser({
        email: "artist@artist.com",
        isAdmin: true,
      });

      const { user } = await createUser({
        email: "first@purchaser.com",
      });
      const { user: secondPurchaser } = await createUser({
        email: "second@purchaser.com",
      });

      const artist = await createArtist(artistUser.id);

      const trackGroup = await createTrackGroup(artist.id);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setMonth(startOfMonth.getMonth() - 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date();
      endOfMonth.setDate(1);
      endOfMonth.setHours(0, 0, 0, 0);

      const thisMonthPurchase = faker.date.between({
        from: endOfMonth,
        to: new Date(),
      });

      const transaction = await prisma.userTransaction.create({
        data: {
          userId: user.id,
          amount: 0,
          currency: "usd",
          platformCut: 0,
          stripeCut: 0,
          createdAt: thisMonthPurchase,
        },
      });

      await prisma.userTrackGroupPurchase.create({
        data: {
          userId: user.id,
          trackGroupId: trackGroup.id,
          userTransactionId: transaction.id,
        },
      });

      const lastMonthDate = faker.date.between({
        from: startOfMonth,
        to: endOfMonth,
      });

      const lastMonthTransaction = await prisma.userTransaction.create({
        data: {
          userId: secondPurchaser.id,
          amount: 0,
          currency: "usd",
          platformCut: 0,
          stripeCut: 0,
          createdAt: lastMonthDate,
        },
      });

      await prisma.userTrackGroupPurchase.create({
        data: {
          userId: secondPurchaser.id,
          trackGroupId: trackGroup.id,
          userTransactionId: lastMonthTransaction.id,
        },
      });

      const response = await requestApp
        .get("admin/purchases?datePurchased=thisMonth")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(
        response.body.results[0].trackGroupPurchases[0].trackGroupId,
        trackGroup.id
      );

      const lastMonthResponse = await requestApp
        .get("admin/purchases?datePurchased=previousMonth")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(lastMonthResponse.statusCode, 200);
      assert.equal(lastMonthResponse.body.results.length, 1);
      assert.equal(
        lastMonthResponse.body.results[0].trackGroupPurchases[0].trackGroupId,
        trackGroup.id
      );
    });
  });
});
