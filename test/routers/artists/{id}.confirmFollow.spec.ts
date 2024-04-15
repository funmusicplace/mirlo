import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "../../../prisma/prisma";
import { clearTables, createArtist, createUser } from "../../utils";

import { requestApp } from "../utils";

describe("artists/{id}/confirmFollow", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    beforeEach(async () => {
      try {
        await clearTables();
      } catch (e) {
        console.error(e);
      }
    });

    it("should 404 if an artist doesn't exist", async () => {
      const response = await requestApp
        .get(`artists/1/confirmFollow`)
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
      assert.equal(response.body.error, "Artist not found");
    });

    it("should confirm a user and add them to the artist followers", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
      });

      const followerEmail = "follower@follower.com";

      await createUser({
        email: followerEmail,
      });

      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });
      const confirmation =
        await prisma.artistUserSubscriptionConfirmation.create({
          data: {
            email: followerEmail,
            artistId: artist.id,
          },
        });

      const response = await requestApp
        .get(`artists/${artist.id}/confirmFollow`)
        .send({
          token: confirmation.token,
          email: followerEmail,
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 302);
      const redirectTo =
        process.env.REACT_APP_CLIENT_DOMAIN +
        `/${artist.urlSlug}/?followSuccess=true`;

      assert.equal(response.header["location"], redirectTo);
      const subscription =
        await prisma.artistUserSubscriptionConfirmation.findFirst({
          where: {
            email: "follower@follower.com",
            artistId: artist.id,
          },
        });

      assert(!subscription);

      const follow = await prisma.artistUserSubscription.findFirst({
        where: {
          user: {
            email: followerEmail,
          },
          artistSubscriptionTier: {
            isDefaultTier: true,
            artistId: artist.id,
          },
        },
      });
      assert(follow);
    });

    it("should create a user and if they didn't already exist in the database", async () => {
      const { user: artistUser } = await createUser({
        email: "test@test.com",
      });

      const followerEmail = "follower@follower.com";

      const artist = await createArtist(artistUser.id, {
        name: "Test artist",
        userId: artistUser.id,
        enabled: true,
      });
      const confirmation =
        await prisma.artistUserSubscriptionConfirmation.create({
          data: {
            email: followerEmail,
            artistId: artist.id,
          },
        });

      const response = await requestApp
        .get(`artists/${artist.id}/confirmFollow`)
        .send({
          token: confirmation.token,
          email: followerEmail,
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 302);
      const redirectTo =
        process.env.REACT_APP_CLIENT_DOMAIN +
        `/${artist.urlSlug}/?followSuccess=true`;

      assert.equal(response.header["location"], redirectTo);
      const subscription =
        await prisma.artistUserSubscriptionConfirmation.findFirst({
          where: {
            email: "follower@follower.com",
            artistId: artist.id,
          },
        });

      assert(!subscription);

      const follow = await prisma.artistUserSubscription.findFirst({
        where: {
          user: {
            email: followerEmail,
          },
          artistSubscriptionTier: {
            isDefaultTier: true,
            artistId: artist.id,
          },
        },
      });
      assert(follow);

      const user = await prisma.user.findFirst({
        where: {
          email: followerEmail,
        },
      });

      assert(user);
      assert.equal(user.emailConfirmationExpiration, null);
      assert.equal(user.emailConfirmationToken, null);
    });
  });
});
