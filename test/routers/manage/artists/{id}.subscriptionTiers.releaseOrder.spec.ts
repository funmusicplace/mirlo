import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import * as sendMailQueueModule from "../../../../src/queues/send-mail-queue";
import {
  clearTables,
  createArtist,
  createTier,
  createTrackGroup,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

const trackGroupIdsOf = (results: { trackGroupId: number }[]) =>
  results.map((r) => r.trackGroupId);

describe("manage/artists/{artistId}/subscriptionTiers/{tierId}/releaseOrder", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(async () => {
    await sendMailQueueModule.sendMailQueue.close();
    await sendMailQueueModule.sendMailQueueEvents.close();
  });

  describe("PUT", () => {
    it("should reorder the releases of a tier and return them in the new order", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id);
      const first = await createTrackGroup(artist.id, {
        title: "First",
        urlSlug: "first",
      });
      const second = await createTrackGroup(artist.id, {
        title: "Second",
        urlSlug: "second",
      });
      const third = await createTrackGroup(artist.id, {
        title: "Third",
        urlSlug: "third",
      });
      await prisma.subscriptionTierRelease.createMany({
        data: [first, second, third].map((tg) => ({
          tierId: tier.id,
          trackGroupId: tg.id,
        })),
      });

      const response = await requestApp
        .put(
          `manage/artists/${artist.id}/subscriptionTiers/${tier.id}/releaseOrder`
        )
        .send({ trackGroupIds: [third.id, first.id, second.id] })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.deepEqual(trackGroupIdsOf(response.body.results), [
        third.id,
        first.id,
        second.id,
      ]);

      const listed = await requestApp
        .get(
          `manage/artists/${artist.id}/subscriptionTiers/${tier.id}/releases`
        )
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.deepEqual(trackGroupIdsOf(listed.body.results), [
        third.id,
        first.id,
        second.id,
      ]);
    });

    it("should place a newly added release first and keep the manual order after it", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id);
      const first = await createTrackGroup(artist.id, {
        title: "First",
        urlSlug: "first",
      });
      const second = await createTrackGroup(artist.id, {
        title: "Second",
        urlSlug: "second",
      });
      const added = await createTrackGroup(artist.id, {
        title: "Added later",
        urlSlug: "added-later",
      });
      await prisma.subscriptionTierRelease.createMany({
        data: [first, second].map((tg) => ({
          tierId: tier.id,
          trackGroupId: tg.id,
        })),
      });

      await requestApp
        .put(
          `manage/artists/${artist.id}/subscriptionTiers/${tier.id}/releaseOrder`
        )
        .send({ trackGroupIds: [second.id, first.id] })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const created = await requestApp
        .post(
          `manage/artists/${artist.id}/subscriptionTiers/${tier.id}/releases`
        )
        .send({ trackGroupId: added.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(created.statusCode, 201);
      assert.equal(created.body.result.order, 1);
      assert.equal(
        created.body.result.trackGroup.isIncludedInSubscription,
        true
      );

      const listed = await requestApp
        .get(
          `manage/artists/${artist.id}/subscriptionTiers/${tier.id}/releases`
        )
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.deepEqual(trackGroupIdsOf(listed.body.results), [
        added.id,
        second.id,
        first.id,
      ]);
    });

    it("should 404 for a tier that does not belong to the user", async () => {
      const { user: owner } = await createUser({ email: "owner@test.com" });
      const { user: other, accessToken } = await createUser({
        email: "other@test.com",
      });
      const ownerArtist = await createArtist(owner.id);
      const otherArtist = await createArtist(other.id, {
        name: "Other",
        urlSlug: "other",
      });
      const tier = await createTier(ownerArtist.id);

      const response = await requestApp
        .put(
          `manage/artists/${otherArtist.id}/subscriptionTiers/${tier.id}/releaseOrder`
        )
        .send({ trackGroupIds: [] })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });
  });
});
