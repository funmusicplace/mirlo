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

      await prisma.userTrackGroupPurchase.create({
        data: {
          trackGroupId: trackGroup.id,
          userId: purchaser.id,
          pricePaid: 10,
          datePurchased: faker.date.between({
            from: "2022-01-01T00:00:00.000Z",
            to: "2023-01-01T00:00:00.000Z",
          }),
        },
      });

      await prisma.merchPurchase.create({
        data: {
          merchId: merch.id,
          userId: purchaser.id,
          amountPaid: 10,
          currencyPaid: "usd",
          quantity: 1,
          fulfillmentStatus: "NO_PROGRESS",
          createdAt: faker.date.between({
            from: "2020-01-01T00:00:00.000Z",
            to: "2021-01-01T00:00:00.000Z",
          }),
        },
      });

      const response = await requestApp
        .get(`users/${purchaser.id}/purchases`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      assert.equal(response.body.results[1].userId, purchaser.id);
      assert.equal(response.body.results[1].merchId, merch.id);
      assert.equal(response.body.results[1].merch.artistId, artist.id);
      assert.equal(response.body.results[1].trackGroup, false);

      assert.equal(response.body.results[0].userId, purchaser.id);
      assert.equal(response.body.results[0].trackGroupId, trackGroup.id);
      assert.equal(response.body.results[0].trackGroup.artistId, artist.id);
      assert.equal(response.body.results[0].merch, false);
    });
  });
});
