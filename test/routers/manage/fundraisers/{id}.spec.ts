import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import prisma from "@mirlo/prisma";

import {
  clearTables,
  createArtist,
  createFundraiser,
  createFundraiserPledge,
  createTrackGroup,
  createUser,
} from "../../../utils";
import { requestApp } from "../../utils";

describe("manage/fundraisers/{fundraiserId}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("lets the profile's owner see a fundraiser without a release", async () => {
      const { user, accessToken } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser(artist.id, {
        name: "Standalone",
      });

      const response = await requestApp
        .get(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.id, fundraiser.id);
    });

    it("hides a fundraiser from other users", async () => {
      const { user } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const { accessToken: otherToken } = await createUser({
        email: "other@example.com",
      });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser(artist.id, {
        name: "Standalone",
      });

      const response = await requestApp
        .get(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${otherToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });
  });

  describe("PUT", () => {
    const setUp = async () => {
      const { user, accessToken } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const { user: backer } = await createUser({
        email: "backer@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const fundraiser = await createFundraiser(trackGroup.profileId, {
        trackGroupId: trackGroup.id,
        isAllOrNothing: true,
      });
      return { accessToken, backer, fundraiser };
    };

    it("refuses to change isAllOrNothing while there are open pledges", async () => {
      const { accessToken, backer, fundraiser } = await setUp();
      await createFundraiserPledge(fundraiser.id, backer.id);

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ isAllOrNothing: false })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);

      const refreshed = await prisma.fundraiser.findUnique({
        where: { id: fundraiser.id },
      });
      assert.equal(refreshed?.isAllOrNothing, true);
    });

    it("still allows other edits while there are open pledges", async () => {
      const { accessToken, backer, fundraiser } = await setUp();
      await createFundraiserPledge(fundraiser.id, backer.id);

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ name: "New name", isAllOrNothing: true })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.name, "New name");
    });

    it("allows changing isAllOrNothing when all pledges are cancelled", async () => {
      const { accessToken, backer, fundraiser } = await setUp();
      await createFundraiserPledge(fundraiser.id, backer.id, {
        cancelledAt: new Date(),
      });

      const response = await requestApp
        .put(`manage/fundraisers/${fundraiser.id}`)
        .send({ isAllOrNothing: false })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const refreshed = await prisma.fundraiser.findUnique({
        where: { id: fundraiser.id },
      });
      assert.equal(refreshed?.isAllOrNothing, false);
    });
  });

  describe("DELETE", () => {
    it("cancels open pledges, keeps paid ones and unlinks the release", async () => {
      const { user, accessToken } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const { user: backer } = await createUser({ email: "a@example.com" });
      const { user: paidBacker } = await createUser({
        email: "b@example.com",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);
      const fundraiser = await createFundraiser(artist.id, {
        trackGroupId: trackGroup.id,
      });
      const openPledge = await createFundraiserPledge(fundraiser.id, backer.id);
      const paidAt = new Date();
      const paidPledge = await createFundraiserPledge(
        fundraiser.id,
        paidBacker.id,
        { paidAt }
      );

      const response = await requestApp
        .delete(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(
        await prisma.fundraiser.findFirst({ where: { id: fundraiser.id } }),
        null
      );

      const pledges = await prisma.fundraiserPledge.findMany({
        where: { fundraiserId: fundraiser.id },
      });
      const open = pledges.find((p) => p.id === openPledge.id);
      const paid = pledges.find((p) => p.id === paidPledge.id);
      assert.ok(open?.cancelledAt);
      assert.equal(paid?.cancelledAt, null);
      assert.deepEqual(paid?.paidAt, paidAt);

      const release = await prisma.trackGroup.findFirst({
        where: { id: trackGroup.id },
      });
      assert.equal(release?.fundraiserId, null);
    });

    it("doesn't let other users delete a fundraiser", async () => {
      const { user } = await createUser({
        email: "fundraiser-owner@example.com",
      });
      const { accessToken: otherToken } = await createUser({
        email: "other@example.com",
      });
      const artist = await createArtist(user.id);
      const fundraiser = await createFundraiser(artist.id);

      const response = await requestApp
        .delete(`manage/fundraisers/${fundraiser.id}`)
        .set("Cookie", [`jwt=${otherToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.ok(
        await prisma.fundraiser.findFirst({ where: { id: fundraiser.id } })
      );
    });
  });
});
