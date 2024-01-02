import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTier,
  createUser,
} from "../../../utils";
import prisma from "../../../../prisma/prisma";

import { requestApp } from "../../utils";
import { faker } from "@faker-js/faker";

describe("users/{userId}/artists/{artistId}/subscriptionTiers", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should POST / content", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });

      const title = faker.lorem.words(2);

      const artist = await createArtist(user.id);
      const response = await requestApp
        .post(`users/${user.id}/artists/${artist.id}/subscriptionTiers`)
        .send({
          name: title,
          description: "description",
          minAmount: 500,
          allowVariable: true,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.deepEqual(response.body.result.name, title);
      assert.equal(response.body.result.minAmount, 500);
      assert.equal(response.body.result.allowVariable, true);
      assert.equal(response.statusCode, 200);
    });
  });
});

describe("users/{userId}/artists/{artistId}/subscriptionTiers/{tierId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("should PUT new details", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });

      const title = faker.lorem.words(2);

      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id);
      const response = await requestApp
        .put(
          `users/${user.id}/artists/${artist.id}/subscriptionTiers/${tier.id}`
        )
        .send({
          allowVariable: true,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.body.result.allowVariable, true);
      assert.equal(response.statusCode, 200);
    });
  });
});
