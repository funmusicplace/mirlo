import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/trackGroups/{trackGroupId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("PUT", () => {
    it("should update defaultIsPreview on a track group", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ artistId: artist.id, defaultIsPreview: false })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.defaultIsPreview, false);
    });

    it("should update a track group without artistId in the body", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ defaultIsPreview: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.defaultIsPreview, true);
    });

    it("should reject a duplicate urlSlug for the same artist", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      await createTrackGroup(artist.id, { urlSlug: "taken-slug" });
      const otherTrackGroup = await createTrackGroup(artist.id, {
        urlSlug: "another-slug",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${otherTrackGroup.id}`)
        .send({ urlSlug: "taken-slug" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 400);
    });

    it("should notify followers when flipping a published trackGroup from private to public", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-flip@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        publishedAt: new Date(),
        isPublic: false,
      });

      const tier = await prisma.artistSubscriptionTier.create({
        data: { artistId: artist.id, name: "Tier" },
      });
      const { user: follower } = await createUser({
        email: "follower-flip@example.com",
      });
      await prisma.artistUserSubscription.create({
        data: {
          userId: follower.id,
          artistSubscriptionTierId: tier.id,
          amount: 10,
          stripeSubscriptionKey: "sub-flip",
        },
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ artistId: artist.id, isPublic: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);

      const notifications = await prisma.notification.findMany({
        where: { trackGroupId: trackGroup.id, userId: follower.id },
      });
      assert.equal(notifications.length, 1);
      assert.equal(notifications[0].notificationType, "NEW_ARTIST_ALBUM");
    });

    it("should not notify followers when flipping isPublic on a draft trackGroup", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-draft-flip@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        publishedAt: null,
        isPublic: false,
      });

      const tier = await prisma.artistSubscriptionTier.create({
        data: { artistId: artist.id, name: "Tier" },
      });
      const { user: follower } = await createUser({
        email: "follower-draft-flip@example.com",
      });
      await prisma.artistUserSubscription.create({
        data: {
          userId: follower.id,
          artistSubscriptionTierId: tier.id,
          amount: 10,
          stripeSubscriptionKey: "sub-draft-flip",
        },
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ artistId: artist.id, isPublic: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);

      const notifications = await prisma.notification.findMany({
        where: { trackGroupId: trackGroup.id },
      });
      assert.equal(notifications.length, 0);
    });

    it("should not notify followers twice when flipping isPublic back and forth", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-toggle@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        publishedAt: new Date(),
        isPublic: false,
      });

      const tier = await prisma.artistSubscriptionTier.create({
        data: { artistId: artist.id, name: "Tier" },
      });
      const { user: follower } = await createUser({
        email: "follower-toggle@example.com",
      });
      await prisma.artistUserSubscription.create({
        data: {
          userId: follower.id,
          artistSubscriptionTierId: tier.id,
          amount: 10,
          stripeSubscriptionKey: "sub-toggle",
        },
      });

      await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ artistId: artist.id, isPublic: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ artistId: artist.id, isPublic: false })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      await requestApp
        .put(`manage/trackGroups/${trackGroup.id}`)
        .send({ artistId: artist.id, isPublic: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const notifications = await prisma.notification.findMany({
        where: { trackGroupId: trackGroup.id, userId: follower.id },
      });
      assert.equal(notifications.length, 1);
    });

    it("should find a new slug for a trackGroup", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      await createTrackGroup(artist.id, {
        urlSlug: "a-title",
      });
      const otherTrackGroup = await createTrackGroup(artist.id, {
        urlSlug: "mi-temp-slug-album-4",
      });

      const response = await requestApp
        .put(`manage/trackGroups/${otherTrackGroup.id}`)
        .send({
          artistId: artist.id,
          minPrice: 500,
          title: "A title",
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.result.urlSlug, "a-title-1");
    });
  });

  describe("DELETE", () => {
    it("should delete a track group", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id, {
        urlSlug: "a-title",
      });

      const response = await requestApp
        .delete(`manage/trackGroups/${trackGroup.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
    });
  });
});
