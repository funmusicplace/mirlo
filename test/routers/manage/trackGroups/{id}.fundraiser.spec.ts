import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../../utils";
import prisma from "@mirlo/prisma";

import { requestApp } from "../../utils";

describe("manage/trackGroups/{trackGroupId}/fundraiser", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("POST", () => {
    it("should create a fundraiser for a track group", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, {
        title: "Test Album",
      });

      const response = await requestApp
        .post(`manage/trackGroups/${trackGroup.id}/fundraiser`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.name, "Test Album Fundraiser");
      assert.equal(response.body.result.goalAmount, 0);

      const fundraiserInDb = await prisma.fundraiser.findFirst({
        where: { id: response.body.result.id },
        include: { trackGroups: true },
      });

      assert.equal(fundraiserInDb?.name, "Test Album Fundraiser");
      assert.equal(fundraiserInDb?.trackGroups.length, 1);
      assert.equal(fundraiserInDb?.trackGroups[0].id, trackGroup.id);
    });

    it("should return existing fundraiser if one already exists", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Existing Fundraiser",
          trackGroups: {
            connect: { id: trackGroup.id },
          },
        },
      });

      const response = await requestApp
        .post(`manage/trackGroups/${trackGroup.id}/fundraiser`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.id, fundraiser.id);
      assert.equal(response.body.result.name, "Existing Fundraiser");
    });
  });

  describe("DELETE", () => {
    it("should delete a fundraiser with no pledges", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          trackGroups: {
            connect: { id: trackGroup.id },
          },
        },
      });

      // Verify fundraiser exists
      let fundraiserExists = await prisma.fundraiser.findFirst({
        where: { id: fundraiser.id },
      });
      assert.equal(fundraiserExists?.id, fundraiser.id);

      const response = await requestApp
        .delete(`manage/trackGroups/${trackGroup.id}/fundraiser`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.success, true);

      // Verify fundraiser is deleted
      fundraiserExists = await prisma.fundraiser.findFirst({
        where: { id: fundraiser.id },
      });
      assert.equal(fundraiserExists, null);

      // Verify trackgroup is still there
      const trackGroupExists = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });
      assert.equal(trackGroupExists?.id, trackGroup.id);
    });

    it("should delete a fundraiser and all its pledges", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          goalAmount: 50000,
          trackGroups: {
            connect: { id: trackGroup.id },
          },
        },
      });

      // Create some pledges
      const pledger1 = await createUser({ email: "pledger1@test.com" });
      const pledger2 = await createUser({ email: "pledger2@test.com" });

      const pledge1 = await prisma.fundraiserPledge.create({
        data: {
          fundraiserId: fundraiser.id,
          userId: pledger1.user.id,
          amount: 5000,
          stripeSetupIntentId: "seti_test1",
          trackGroupId: trackGroup.id,
        },
      });

      const pledge2 = await prisma.fundraiserPledge.create({
        data: {
          fundraiserId: fundraiser.id,
          userId: pledger2.user.id,
          amount: 3000,
          stripeSetupIntentId: "seti_test2",
          trackGroupId: trackGroup.id,
        },
      });

      // Verify pledges exist
      let pledgesCount = await prisma.fundraiserPledge.count({
        where: { fundraiserId: fundraiser.id },
      });
      assert.equal(pledgesCount, 2);

      const response = await requestApp
        .delete(`manage/trackGroups/${trackGroup.id}/fundraiser`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.success, true);

      // Verify fundraiser is deleted
      const fundraiserExists = await prisma.fundraiser.findFirst({
        where: { id: fundraiser.id },
      });
      assert.equal(fundraiserExists, null);

      // Verify all pledges are deleted
      pledgesCount = await prisma.fundraiserPledge.count({
        where: { fundraiserId: fundraiser.id },
      });
      assert.equal(pledgesCount, 0);
    });

    it("should return 404 if track group does not exist", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });

      const response = await requestApp
        .delete(`manage/trackGroups/99999/fundraiser`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      console.log(response.body);
      assert.equal(
        response.body.error,
        "TrackGroup does not exist or does not belong to user"
      );
    });

    it("should return 404 if fundraiser does not exist on track group", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .delete(`manage/trackGroups/${trackGroup.id}/fundraiser`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.equal(response.body.error, "Fundraiser not found");
    });

    it("should return 401 if user does not own the track group", async () => {
      const { user: owner, accessToken: ownerToken } = await createUser({
        email: "owner@testcom",
      });
      const { user: nonOwner, accessToken: nonOwnerToken } = await createUser({
        email: "nonowner@testcom",
      });

      const artist = await createArtist(owner.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          trackGroups: {
            connect: { id: trackGroup.id },
          },
        },
      });

      const response = await requestApp
        .delete(`manage/trackGroups/${trackGroup.id}/fundraiser`)
        .set("Cookie", [`jwt=${nonOwnerToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);

      // Verify fundraiser still exists
      const fundraiserExists = await prisma.fundraiser.findFirst({
        where: { id: fundraiser.id },
      });
      assert.equal(fundraiserExists?.id, fundraiser.id);
    });

    it("should delete fundraiser and update trackgroup", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          trackGroups: {
            connect: { id: trackGroup.id },
          },
        },
      });

      // Verify trackgroup has fundraiser
      let trackGroupWithFundraiser = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
        include: { fundraiser: true },
      });
      assert.equal(trackGroupWithFundraiser?.fundraiserId, fundraiser.id);

      await requestApp
        .delete(`manage/trackGroups/${trackGroup.id}/fundraiser`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      // Verify fundraiser reference is removed
      trackGroupWithFundraiser = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
        include: { fundraiser: true },
      });
      assert.equal(trackGroupWithFundraiser?.fundraiserId, null);
      assert.equal(trackGroupWithFundraiser?.fundraiser, null);
    });
  });
});
