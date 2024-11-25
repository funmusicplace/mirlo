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

describe("users/{userId}/charges", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should return all charges for logged in user", async () => {
      const { user: purchaser, accessToken } = await createUser({
        email: "purchaser@testcom",
      });

      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tier = await prisma.artistSubscriptionTier.create({
        data: {
          artistId: artist.id,
          name: "Tier",
        },
      });
      const artistUserSubscription = await prisma.artistUserSubscription.create(
        {
          data: {
            artistSubscriptionTierId: tier.id,
            userId: purchaser.id,
            amount: 1000,
          },
        }
      );

      await prisma.artistUserSubscriptionCharge.create({
        data: {
          amountPaid: 1000,
          paymentProcessor: "stripe",
          currency: "usd",
          artistUserSubscriptionId: artistUserSubscription.id,
        },
      });

      const response = await requestApp
        .get(`users/${purchaser.id}/charges`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      assert.equal(response.body.results.length, 1);
    });
  });
});
