import assert from "node:assert";
import { Prisma } from "@prisma/client";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import { clearTables, createArtist, createUser } from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("users/{userId}/posts", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should GET /", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });

      const response = await requestApp
        .get(`users/${user.id}/posts`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.deepEqual(response.body.results, []);
      assert(response.statusCode === 200);
    });
  });

  describe("POST", () => {
    it("should POST a post successfully", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });

      const artist = await createArtist(user.id, {
        subscriptionTiers: {
          create: {
            name: "a tier",
            isDefaultTier: true,
          },
        },
      });

      const response = await requestApp
        .post(`users/${user.id}/posts`)
        .send({
          title: "My title",
          artistId: artist.id,
          content: "Some content",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.status, 200);
      assert.equal(response.body.result.title, "My title");
      assert.equal(response.body.result.shouldSendEmail, true);
    });

    it("should POST a post successfully and set shouldSendEmail to false", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });

      const artist = await createArtist(user.id, {
        subscriptionTiers: {
          create: {
            name: "a tier",
            isDefaultTier: true,
          },
        },
      });

      const response = await requestApp
        .post(`users/${user.id}/posts`)
        .send({
          title: "My title",
          artistId: artist.id,
          content: "Some content",
          shouldSendEmail: false,
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.status, 200);
      assert.equal(response.body.result.title, "My title");
      assert.equal(response.body.result.shouldSendEmail, false);
    });

    it("should POST a post with an empty string title", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id, {
        subscriptionTiers: {
          create: {
            name: "a tier",
            isDefaultTier: true,
          },
        },
      });

      const response = await requestApp
        .post(`users/${user.id}/posts`)
        .send({
          artistId: artist.id,
          title: "",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.title, "");
    });

    it("should not POST a post when artistId doesn't belong to user", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: artistUser } = await createUser({
        email: "artist@artist.com",
      });

      const artist = await createArtist(artistUser.id);
      const response = await requestApp
        .post(`users/${user.id}/posts`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.status, 400);
      assert.equal(response.body.error, "Artist must belong to user");
    });

    it("should not POST a post when tier does not belong to artist", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });

      const artist = await createArtist(user.id);
      const response = await requestApp
        .post(`users/${user.id}/posts`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.status, 400);
      assert.equal(
        response.body.error,
        "That tier doesn't belong to the current artist"
      );
    });
  });
});
