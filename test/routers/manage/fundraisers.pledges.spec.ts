import assert from "node:assert";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";
import {
  clearTables,
  createArtist,
  createTrackGroup,
  createUser,
} from "../../utils";
import prisma from "@mirlo/prisma";

const baseURL = `${process.env.API_DOMAIN}/v1/`;
const requestApp = request(baseURL);

describe("manage/fundraisers/{fundraiserId}/pledges", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should return pledges for a fundraiser", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);

      // Create a trackGroup with a fundraiser
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          goalAmount: 50000,
          trackGroups: {
            connect: {
              id: trackGroup.id,
            },
          },
        },
      });

      // Create some pledges
      const pledger1 = await createUser({ email: "pledger1@test.com" });
      const pledger2 = await createUser({ email: "pledger2@test.com" });

      await prisma.fundraiserPledge.create({
        data: {
          fundraiserId: fundraiser.id,
          userId: pledger1.user.id,
          amount: 5000,
          stripeSetupIntentId: "seti_test1",
          trackGroupId: trackGroup.id,
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          fundraiserId: fundraiser.id,
          userId: pledger2.user.id,
          amount: 3000,
          stripeSetupIntentId: "seti_test2",
          trackGroupId: trackGroup.id,
          cancelledAt: new Date(),
        },
      });

      const response = await requestApp
        .get(`manage/fundraisers/${fundraiser.id}/pledges`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.total, 1);
      assert.equal(response.body.results[0].amount, 5000);
      assert.equal(response.body.results[0].user.email, "pledger1@test.com");
    });

    it("should include cancelled pledges when includeCancelled=true", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          goalAmount: 50000,
          trackGroups: {
            connect: {
              id: trackGroup.id,
            },
          },
        },
      });

      const pledger1 = await createUser({ email: "pledger1@test.com" });
      const pledger2 = await createUser({ email: "pledger2@test.com" });

      await prisma.fundraiserPledge.create({
        data: {
          fundraiserId: fundraiser.id,
          userId: pledger1.user.id,
          amount: 5000,
          stripeSetupIntentId: "seti_test1",
          trackGroupId: trackGroup.id,
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          fundraiserId: fundraiser.id,
          userId: pledger2.user.id,
          amount: 3000,
          stripeSetupIntentId: "seti_test2",
          trackGroupId: trackGroup.id,
          cancelledAt: new Date(),
        },
      });

      const response = await requestApp
        .get(
          `manage/fundraisers/${fundraiser.id}/pledges?includeCancelled=true`
        )
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 2);
      assert.equal(response.body.total, 2);
    });

    it("should return empty pledges for fundraiser with no pledges", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          goalAmount: 50000,
          trackGroups: {
            connect: {
              id: trackGroup.id,
            },
          },
        },
      });

      const response = await requestApp
        .get(`manage/fundraisers/${fundraiser.id}/pledges`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 0);
      assert.equal(response.body.total, 0);
    });

    it("should include user information in response", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          goalAmount: 50000,
          trackGroups: {
            connect: {
              id: trackGroup.id,
            },
          },
        },
      });

      const pledger = await createUser({
        email: "pledger@test.com",
        name: "John Pledger",
      });

      await prisma.fundraiserPledge.create({
        data: {
          fundraiserId: fundraiser.id,
          userId: pledger.user.id,
          amount: 5000,
          stripeSetupIntentId: "seti_test1",
          trackGroupId: trackGroup.id,
        },
      });

      const response = await requestApp
        .get(`manage/fundraisers/${fundraiser.id}/pledges`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert(response.body.results[0].user);
      assert.equal(response.body.results[0].user.id, pledger.user.id);
      assert.equal(response.body.results[0].user.email, "pledger@test.com");
      assert.equal(response.body.results[0].user.name, "John Pledger");
    });

    it("should require authentication", async () => {
      const { user } = await createUser({ email: "test@test.com" });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          goalAmount: 50000,
          trackGroups: {
            connect: {
              id: trackGroup.id,
            },
          },
        },
      });

      const response = await requestApp
        .get(`manage/fundraisers/${fundraiser.id}/pledges`)
        .set("Accept", "application/json");

      assert.equal(response.status, 401);
    });

    it("should require ownership of the fundraiser", async () => {
      const { user: owner, accessToken: ownerToken } = await createUser({
        email: "owner@test.com",
      });
      const { user: otherUser, accessToken: otherToken } = await createUser({
        email: "other@test.com",
      });

      const artist = await createArtist(owner.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          goalAmount: 50000,
          trackGroups: {
            connect: {
              id: trackGroup.id,
            },
          },
        },
      });

      const response = await requestApp
        .get(`manage/fundraisers/${fundraiser.id}/pledges`)
        .set("Cookie", [`jwt=${otherToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 404);
    });

    it("should order pledges by createdAt descending", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);

      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          goalAmount: 50000,
          trackGroups: {
            connect: {
              id: trackGroup.id,
            },
          },
        },
      });

      const pledger1 = await createUser({ email: "pledger1@test.com" });
      const pledger2 = await createUser({ email: "pledger2@test.com" });
      const pledger3 = await createUser({ email: "pledger3@test.com" });

      const now = new Date();

      await prisma.fundraiserPledge.create({
        data: {
          fundraiserId: fundraiser.id,
          userId: pledger1.user.id,
          amount: 5000,
          stripeSetupIntentId: "seti_test1",
          trackGroupId: trackGroup.id,
          createdAt: new Date(now.getTime() - 2000),
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          fundraiserId: fundraiser.id,
          userId: pledger2.user.id,
          amount: 3000,
          stripeSetupIntentId: "seti_test2",
          trackGroupId: trackGroup.id,
          createdAt: new Date(now.getTime() - 1000),
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          fundraiserId: fundraiser.id,
          userId: pledger3.user.id,
          amount: 2000,
          stripeSetupIntentId: "seti_test3",
          trackGroupId: trackGroup.id,
          createdAt: now,
        },
      });

      const response = await requestApp
        .get(`manage/fundraisers/${fundraiser.id}/pledges`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 3);
      // Most recent first
      assert.equal(response.body.results[0].amount, 2000);
      assert.equal(response.body.results[1].amount, 3000);
      assert.equal(response.body.results[2].amount, 5000);
    });

    it("should filter by fundraiserId correctly", async () => {
      const { user, accessToken } = await createUser({
        email: "test@test.com",
      });
      const artist = await createArtist(user.id);

      const trackGroup1 = await createTrackGroup(artist.id, {
        title: "album 1",
        urlSlug: "album-1",
      });
      const trackGroup2 = await createTrackGroup(artist.id);

      const fundraiser1 = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser 1",
          goalAmount: 50000,
          trackGroups: {
            connect: {
              id: trackGroup1.id,
            },
          },
        },
      });

      const fundraiser2 = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser 2",
          goalAmount: 50000,
          trackGroups: {
            connect: {
              id: trackGroup2.id,
            },
          },
        },
      });

      const pledger = await createUser({ email: "pledger@test.com" });

      await prisma.fundraiserPledge.create({
        data: {
          fundraiserId: fundraiser1.id,
          userId: pledger.user.id,
          amount: 5000,
          stripeSetupIntentId: "seti_test1",
          trackGroupId: trackGroup1.id,
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          fundraiserId: fundraiser2.id,
          userId: pledger.user.id,
          amount: 3000,
          stripeSetupIntentId: "seti_test2",
          trackGroupId: trackGroup2.id,
        },
      });

      const response1 = await requestApp
        .get(`manage/fundraisers/${fundraiser1.id}/pledges`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      const response2 = await requestApp
        .get(`manage/fundraisers/${fundraiser2.id}/pledges`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response1.status, 200);
      assert.equal(response1.body.results.length, 1);
      assert.equal(response1.body.results[0].amount, 5000);

      assert.equal(response2.status, 200);
      assert.equal(response2.body.results.length, 1);
      assert.equal(response2.body.results[0].amount, 3000);
    });
  });
});
