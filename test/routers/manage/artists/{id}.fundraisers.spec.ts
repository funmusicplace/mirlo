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
  createUserTrackGroupPurchase,
} from "../../../utils";
import { requestApp } from "../../utils";

describe("manage/artists/{artistId}/fundraisers", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("lists the artist's fundraisers with how much each has raised", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const { user: backer } = await createUser({ email: "backer@testcom" });
      const artist = await createArtist(user.id);
      const otherArtist = await createArtist(backer.id);
      const pledged = await createFundraiser(artist.id, {
        name: "Pledged",
        isAllOrNothing: true,
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      });
      await createFundraiserPledge(pledged.id, backer.id, { amount: 4000 });
      const trackGroup = await createTrackGroup(artist.id);
      await createFundraiser(artist.id, {
        name: "Album sales",
        trackGroupId: trackGroup.id,
      });
      await createUserTrackGroupPurchase(backer.id, trackGroup.id, {
        amount: 1500,
      });
      await createFundraiser(otherArtist.id, { name: "Someone else's" });

      const response = await requestApp
        .get(`manage/artists/${artist.id}/fundraisers`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const byName = Object.fromEntries(
        response.body.results.map((f: any) => [f.name, f])
      );
      assert.deepEqual(Object.keys(byName).sort(), ["Album sales", "Pledged"]);
      assert.equal(byName["Pledged"].amountRaised, 4000);
      assert.equal(byName["Pledged"].pledgeCount, 1);
      assert.equal(byName["Album sales"].amountRaised, 1500);
      assert.deepEqual(byName["Album sales"].trackGroups, [
        { id: trackGroup.id, title: trackGroup.title },
      ]);
      assert.equal(byName["Pledged"].artistId, artist.id);
      assert.equal(byName["Pledged"].profileId, undefined);
      assert.ok(byName["Pledged"].videoEmbedUrl);
    });

    it("counts pledges per fundraiser, leaving out cancelled ones", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const first = await createFundraiser(artist.id, {
        name: "First",
        isAllOrNothing: true,
      });
      const second = await createFundraiser(artist.id, {
        name: "Second",
        isAllOrNothing: true,
      });
      await createFundraiser(artist.id, { name: "Empty" });
      for (let i = 0; i < 3; i++) {
        const { user: backer } = await createUser({
          email: `backer${i}@testcom`,
        });
        await createFundraiserPledge(first.id, backer.id, { amount: 1000 });
        await createFundraiserPledge(second.id, backer.id, {
          amount: 300,
          cancelledAt: i === 0 ? new Date() : undefined,
        });
      }

      const response = await requestApp
        .get(`manage/artists/${artist.id}/fundraisers`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      const totals = Object.fromEntries(
        response.body.results.map((f: any) => [
          f.name,
          [f.amountRaised, f.pledgeCount],
        ])
      );
      assert.deepEqual(totals, {
        First: [3000, 3],
        Second: [600, 2],
        Empty: [0, 0],
      });
    });

    it("should return 404 if user can't edit the artist", async () => {
      const { user } = await createUser({ email: "owner@testcom" });
      const { accessToken: otherToken } = await createUser({
        email: "nonowner@testcom",
      });
      const artist = await createArtist(user.id);

      const response = await requestApp
        .get(`manage/artists/${artist.id}/fundraisers`)
        .set("Cookie", [`jwt=${otherToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });
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
        .post(`manage/artists/${artist.id}/fundraisers`)
        .send({ trackGroupId: trackGroup.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.name, "Test Album Fundraiser");
      assert.equal(response.body.result.goalAmount, 0);

      const fundraiserInDb = await prisma.fundraiser.findFirst({
        where: { id: response.body.result.id },
        include: { trackGroups: true },
      });

      assert.equal(fundraiserInDb?.profileId, artist.id);
      assert.deepEqual(
        fundraiserInDb?.trackGroups.map((tg) => tg.id),
        [trackGroup.id]
      );
    });

    it("should copy the release's minimum price as the minimum pledge", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id, { minPrice: 1200 });

      const response = await requestApp
        .post(`manage/artists/${artist.id}/fundraisers`)
        .send({ trackGroupId: trackGroup.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.minPledge, 1200);
    });

    it("should create a fundraiser without a track group", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);

      const response = await requestApp
        .post(`manage/artists/${artist.id}/fundraisers`)
        .send({ name: "New van" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.name, "New van");

      const fundraiserInDb = await prisma.fundraiser.findFirstOrThrow({
        where: { id: response.body.result.id },
        include: { trackGroups: true },
      });
      assert.equal(fundraiserInDb.profileId, artist.id);
      assert.equal(fundraiserInDb.trackGroups.length, 0);
    });

    it("gives a new fundraiser a URL slug from its name, unique for the artist", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      await createFundraiser(artist.id, { urlSlug: "new-van" });

      const response = await requestApp
        .post(`manage/artists/${artist.id}/fundraisers`)
        .send({ name: "New Van!" })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.urlSlug, "new-van-2");
      assert.equal(response.body.result.isPublic, false);
    });

    it("should require a name for a fundraiser without a track group", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);

      const response = await requestApp
        .post(`manage/artists/${artist.id}/fundraisers`)
        .send({ name: "  " })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 400);
      assert.equal(await prisma.fundraiser.count(), 0);
    });

    it("should return existing fundraiser if one already exists", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await createFundraiser(artist.id, {
        trackGroupId: trackGroup.id,
        name: "Existing Fundraiser",
      });

      const response = await requestApp
        .post(`manage/artists/${artist.id}/fundraisers`)
        .send({ trackGroupId: trackGroup.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.result.id, fundraiser.id);
      assert.equal(response.body.result.name, "Existing Fundraiser");
    });

    it("should not attach a fundraiser to another artist's track group", async () => {
      const { user, accessToken } = await createUser({
        email: "test@testcom",
      });
      const { user: otherUser } = await createUser({
        email: "other@testcom",
      });
      const artist = await createArtist(user.id);
      const otherArtist = await createArtist(otherUser.id);
      const otherTrackGroup = await createTrackGroup(otherArtist.id);

      const response = await requestApp
        .post(`manage/artists/${artist.id}/fundraisers`)
        .send({ trackGroupId: otherTrackGroup.id })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.equal(await prisma.fundraiser.count(), 0);
    });

    it("should return 404 if user can't edit the artist", async () => {
      const { user } = await createUser({ email: "owner@testcom" });
      const { accessToken: otherToken } = await createUser({
        email: "nonowner@testcom",
      });
      const artist = await createArtist(user.id);
      const trackGroup = await createTrackGroup(artist.id);

      const response = await requestApp
        .post(`manage/artists/${artist.id}/fundraisers`)
        .send({ trackGroupId: trackGroup.id })
        .set("Cookie", [`jwt=${otherToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
      assert.equal(await prisma.fundraiser.count(), 0);
    });
  });
});
