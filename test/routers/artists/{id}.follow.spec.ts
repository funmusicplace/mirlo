import assert from "node:assert";
import { randomUUID } from "node:crypto";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";
import { clearTables, createArtist, createUser } from "../../utils";

import { requestApp } from "../utils";

describe("artists/{id]/follow", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    beforeEach(async () => {
      try {
        await clearTables();
      } catch (e) {
        console.error(e);
      }
    });

    it("should 404 if an artist doesn't exist", async () => {
      const response = await requestApp
        .post(`artists/1/follow`)
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
      assert.equal(response.body.error, "Artist not found");
    });

    it("should follow an artist", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
        emailConfirmationToken: null,
      });

      const { user: followerUser, accessToken } = await createUser({
        email: "follower@follower.com",
        emailConfirmationToken: null,
      });
      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });
      const response = await requestApp
        .post(`artists/${artist.id}/follow`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.body.results[0].userId, followerUser.id);
      assert.equal(response.status, 200);

      const subscription = await prisma.artistUserSubscription.findFirst({
        where: {
          userId: followerUser.id,
          artistSubscriptionTier: {
            artistId: artist.id,
          },
        },
      });

      assert(subscription);
    });

    it("should create a follow confirmation when not logged in", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
        emailConfirmationToken: null,
      });

      await createUser({
        email: "follower@follower.com",
        emailConfirmationToken: null,
      });
      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });
      const response = await requestApp
        .post(`artists/${artist.id}/follow`)
        .send({
          email: "follower@follower.com",
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 200);

      const subscription =
        await prisma.artistUserSubscriptionConfirmation.findFirst({
          where: {
            email: "follower@follower.com",
            artistId: artist.id,
          },
        });

      assert(subscription);
    });

    it("should create a follow confirmation when not logged in and user doesn't exist", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
        emailConfirmationToken: null,
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });
      const response = await requestApp
        .post(`artists/${artist.id}/follow`)
        .send({
          email: "follower@follower.com",
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 200);

      const subscription =
        await prisma.artistUserSubscriptionConfirmation.findFirst({
          where: {
            email: "follower@follower.com",
            artistId: artist.id,
          },
        });

      assert(subscription);
    });

    it("should reject logged in users without a verified email", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
        emailConfirmationToken: null,
      });

      const { accessToken } = await createUser({
        email: "follower@follower.com",
        emailConfirmationToken: randomUUID(),
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });

      const response = await requestApp
        .post(`artists/${artist.id}/follow`)
        .set("Accept", "application/json")
        .set("Cookie", [`jwt=${accessToken}`]);

      assert.equal(response.status, 401);
      assert.equal(
        response.body.error,
        "Please verify your email before subscribing.",
      );
    });

    it("should reject anonymous follow requests for unverified users", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
        emailConfirmationToken: null,
      });

      await createUser({
        email: "follower@follower.com",
        emailConfirmationToken: randomUUID(),
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });

      const response = await requestApp
        .post(`artists/${artist.id}/follow`)
        .send({
          email: "follower@follower.com",
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 401);
      assert.equal(
        response.body.error,
        "Please verify your email before subscribing.",
      );
    });
  });
});
