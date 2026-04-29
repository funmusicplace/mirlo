import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

import prisma from "@mirlo/prisma";

describe("manage/trackGroups/{trackGroupId}/publish", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (error) {
      console.error(error);
    }
  });

  describe("PUT", () => {
    it("should publish a track group when a cover is present", async () => {
      const { user, accessToken } = await createUser({
        email: "artist@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        publishedAt: null,
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const updatedTrackGroup = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });

      assert.ok(updatedTrackGroup?.publishedAt);
    });

    it("should reject publishing when the track group has no cover", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-no-cover@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        publishedAt: null,
      });

      await prisma.trackGroupCover.delete({
        where: { trackGroupId: trackGroup.id },
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);

      const unchangedTrackGroup = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });

      assert.equal(unchangedTrackGroup?.publishedAt, null);
    });

    it("should publish a track group without tracks when fundraising", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-goal@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        publishedAt: null,
        tracks: [],
        fundraisingGoal: 1000,
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const updatedTrackGroup = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });

      assert.ok(updatedTrackGroup?.publishedAt);
    });

    it("should publish even if track audio is still processing", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-processing-tracks@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        publishedAt: null,
      });

      const track = await prisma.track.findFirst({
        where: { trackGroupId: trackGroup.id },
      });

      await prisma.trackAudio.updateMany({
        where: { trackId: track?.id },
        data: { uploadState: "STARTED" },
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const updatedTrackGroup = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });

      assert.ok(updatedTrackGroup?.publishedAt);
    });

    it("should notify followers when publishing a public trackGroup", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-public@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        publishedAt: null,
      });

      const tier = await prisma.artistSubscriptionTier.create({
        data: { artistId: artist.id, name: "Tier" },
      });
      const { user: follower } = await createUser({
        email: "follower-public@example.com",
      });
      await prisma.artistUserSubscription.create({
        data: {
          userId: follower.id,
          artistSubscriptionTierId: tier.id,
          amount: 10,
          stripeSubscriptionKey: "sub-public",
        },
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const notifications = await prisma.notification.findMany({
        where: { trackGroupId: trackGroup.id, userId: follower.id },
      });
      assert.equal(notifications.length, 1);
      assert.equal(notifications[0].notificationType, "NEW_ARTIST_ALBUM");
    });

    it("should not notify followers when publishing a private trackGroup", async () => {
      const { user, accessToken } = await createUser({
        email: "artist-private@example.com",
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
        email: "follower-private@example.com",
      });
      await prisma.artistUserSubscription.create({
        data: {
          userId: follower.id,
          artistSubscriptionTierId: tier.id,
          amount: 10,
          stripeSubscriptionKey: "sub-private",
        },
      });

      const response = await requestApp
        .put(`manage/trackGroups/${trackGroup.id}/publish`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const updated = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });
      assert.ok(updated?.publishedAt);

      const notifications = await prisma.notification.findMany({
        where: { trackGroupId: trackGroup.id },
      });
      assert.equal(notifications.length, 0);
    });
  });
});
