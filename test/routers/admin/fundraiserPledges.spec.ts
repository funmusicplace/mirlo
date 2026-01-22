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
import { faker } from "@faker-js/faker";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

const requestApp = request(baseURL);

describe("admin/fundraiserPledges", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET /", () => {
    it("should return 401 without user", async () => {
      const response = await requestApp
        .get("admin/fundraiserPledges")
        .set("Accept", "application/json");

      assert(response.statusCode === 401);
    });

    it("should return 401 without admin permission", async () => {
      const { accessToken } = await createUser({
        email: "user@user.com",
      });
      const response = await requestApp
        .get("admin/fundraiserPledges")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 401);
    });

    it("should return 200 with admin permission", async () => {
      const { accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const response = await requestApp
        .get("admin/fundraiserPledges")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      assert.equal(response.body.results.length, 0);
      assert.equal(response.body.total, 0);
      assert.equal(response.body.page, 1);
      assert.equal(response.body.limit, 20);
    });

    it("should return pledges with correct structure", async () => {
      const { user: adminUser, accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const { user: pledgerUser } = await createUser({
        email: "pledger@user.com",
      });

      const artist = await createArtist(adminUser.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          description: "A test fundraiser",
          goalAmount: 10000,
          trackGroups: {
            connect: [{ id: trackGroup.id }],
          },
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser.id,
          fundraiserId: fundraiser.id,
          amount: 5000,
          stripeSetupIntentId: "test-intent-id",
          paidAt: new Date(),
        },
      });

      const response = await requestApp
        .get("admin/fundraiserPledges")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.total, 1);

      const pledge = response.body.results[0];
      assert(pledge.id);
      assert.equal(pledge.amount, 5000);
      assert(pledge.paidAt);
      assert(pledge.user);
      assert.equal(pledge.user.email, pledgerUser.email);
      assert(pledge.fundraiser);
      assert.equal(pledge.fundraiser.name, "Test Fundraiser");
      assert(Array.isArray(pledge.fundraiser.trackGroups));
    });

    it("should filter by pledgeStatus=paid", async () => {
      const { user: adminUser, accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const pledgerUser1 = (
        await createUser({
          email: "pledger1@user.com",
        })
      ).user;

      const pledgerUser2 = (
        await createUser({
          email: "pledger2@user.com",
        })
      ).user;

      const artist = await createArtist(adminUser.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          description: "A test fundraiser",
          goalAmount: 10000,
          trackGroups: {
            connect: [{ id: trackGroup.id }],
          },
        },
      });

      // Create paid pledge
      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser1.id,
          fundraiserId: fundraiser.id,
          amount: 5000,
          stripeSetupIntentId: "test-intent-1",
          paidAt: new Date(),
        },
      });

      // Create pending pledge
      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser2.id,
          fundraiserId: fundraiser.id,
          amount: 3000,
          stripeSetupIntentId: "test-intent-2",
        },
      });

      const response = await requestApp
        .get("admin/fundraiserPledges?pledgeStatus=paid")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].amount, 5000);
      assert(response.body.results[0].paidAt);
    });

    it("should filter by pledgeStatus=pending", async () => {
      const { user: adminUser, accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const pledgerUser1 = (
        await createUser({
          email: "pledger1@user.com",
        })
      ).user;

      const pledgerUser2 = (
        await createUser({
          email: "pledger2@user.com",
        })
      ).user;

      const artist = await createArtist(adminUser.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          description: "A test fundraiser",
          goalAmount: 10000,
          trackGroups: {
            connect: [{ id: trackGroup.id }],
          },
        },
      });

      // Create paid pledge
      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser1.id,
          fundraiserId: fundraiser.id,
          amount: 5000,
          stripeSetupIntentId: "test-intent-1",
          paidAt: new Date(),
        },
      });

      // Create pending pledge
      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser2.id,
          fundraiserId: fundraiser.id,
          amount: 3000,
          stripeSetupIntentId: "test-intent-2",
        },
      });

      const response = await requestApp
        .get("admin/fundraiserPledges?pledgeStatus=pending")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].amount, 3000);
      assert(!response.body.results[0].paidAt);
    });

    it("should filter by pledgeStatus=cancelled", async () => {
      const { user: adminUser, accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const pledgerUser1 = (
        await createUser({
          email: "pledger1@user.com",
        })
      ).user;

      const pledgerUser2 = (
        await createUser({
          email: "pledger2@user.com",
        })
      ).user;

      const artist = await createArtist(adminUser.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          description: "A test fundraiser",
          goalAmount: 10000,
          trackGroups: {
            connect: [{ id: trackGroup.id }],
          },
        },
      });

      // Create paid pledge
      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser1.id,
          fundraiserId: fundraiser.id,
          amount: 5000,
          stripeSetupIntentId: "test-intent-1",
          paidAt: new Date(),
        },
      });

      // Create cancelled pledge
      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser2.id,
          fundraiserId: fundraiser.id,
          amount: 3000,
          stripeSetupIntentId: "test-intent-2",
          cancelledAt: new Date(),
        },
      });

      const response = await requestApp
        .get("admin/fundraiserPledges?pledgeStatus=cancelled")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].amount, 3000);
      assert(response.body.results[0].cancelledAt);
    });

    it("should search by pledger name", async () => {
      const { user: adminUser, accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const pledgerUser1 = (
        await createUser({
          email: "pledger1@user.com",
          name: "John Smith",
        })
      ).user;

      const pledgerUser2 = (
        await createUser({
          email: "pledger2@user.com",
          name: "Jane Doe",
        })
      ).user;

      const artist = await createArtist(adminUser.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          description: "A test fundraiser",
          goalAmount: 10000,
          trackGroups: {
            connect: [{ id: trackGroup.id }],
          },
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser1.id,
          fundraiserId: fundraiser.id,
          amount: 5000,
          stripeSetupIntentId: "test-intent-1",
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser2.id,
          fundraiserId: fundraiser.id,
          amount: 3000,
          stripeSetupIntentId: "test-intent-2",
        },
      });

      const response = await requestApp
        .get("admin/fundraiserPledges?search=John")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].user.name, "John Smith");
    });

    it("should search by pledger email", async () => {
      const { user: adminUser, accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const pledgerUser1 = (
        await createUser({
          email: "john@example.com",
        })
      ).user;

      const pledgerUser2 = (
        await createUser({
          email: "jane@example.com",
        })
      ).user;

      const artist = await createArtist(adminUser.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          description: "A test fundraiser",
          goalAmount: 10000,
          trackGroups: {
            connect: [{ id: trackGroup.id }],
          },
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser1.id,
          fundraiserId: fundraiser.id,
          amount: 5000,
          stripeSetupIntentId: "test-intent-1",
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser2.id,
          fundraiserId: fundraiser.id,
          amount: 3000,
          stripeSetupIntentId: "test-intent-2",
        },
      });

      const response = await requestApp
        .get("admin/fundraiserPledges?search=john@example")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].user.email, "john@example.com");
    });

    it("should search by artist name", async () => {
      const { user: adminUser, accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const pledgerUser = (
        await createUser({
          email: "pledger@user.com",
        })
      ).user;

      const artist1 = await createArtist(adminUser.id, {
        name: "The Beatles",
      });
      const artist2 = await createArtist(adminUser.id, {
        name: "Pink Floyd",
      });

      const trackGroup1 = await createTrackGroup(artist1.id);
      const trackGroup2 = await createTrackGroup(artist2.id);

      const fundraiser1 = await prisma.fundraiser.create({
        data: {
          name: "Beatles Fundraiser",
          description: "A Beatles fundraiser",
          goalAmount: 10000,
          trackGroups: {
            connect: [{ id: trackGroup1.id }],
          },
        },
      });

      const fundraiser2 = await prisma.fundraiser.create({
        data: {
          name: "Floyd Fundraiser",
          description: "A Floyd fundraiser",
          goalAmount: 10000,
          trackGroups: {
            connect: [{ id: trackGroup2.id }],
          },
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser.id,
          fundraiserId: fundraiser1.id,
          amount: 5000,
          stripeSetupIntentId: "test-intent-1",
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser.id,
          fundraiserId: fundraiser2.id,
          amount: 3000,
          stripeSetupIntentId: "test-intent-2",
        },
      });

      const response = await requestApp
        .get("admin/fundraiserPledges?search=Beatles")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(
        response.body.results[0].fundraiser.trackGroups[0].artist.name,
        "The Beatles"
      );
    });

    it("should search by album title", async () => {
      const { user: adminUser, accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const pledgerUser = (
        await createUser({
          email: "pledger@user.com",
        })
      ).user;

      const artist = await createArtist(adminUser.id);

      const trackGroup1 = await createTrackGroup(artist.id, {
        title: "Abbey Road",
      });
      const trackGroup2 = await createTrackGroup(artist.id, {
        title: "Sgt. Pepper",
      });

      const fundraiser1 = await prisma.fundraiser.create({
        data: {
          name: "Fundraiser 1",
          description: "A fundraiser",
          goalAmount: 10000,
          trackGroups: {
            connect: [{ id: trackGroup1.id }],
          },
        },
      });

      const fundraiser2 = await prisma.fundraiser.create({
        data: {
          name: "Fundraiser 2",
          description: "Another fundraiser",
          goalAmount: 10000,
          trackGroups: {
            connect: [{ id: trackGroup2.id }],
          },
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser.id,
          fundraiserId: fundraiser1.id,
          amount: 5000,
          stripeSetupIntentId: "test-intent-1",
        },
      });

      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser.id,
          fundraiserId: fundraiser2.id,
          amount: 3000,
          stripeSetupIntentId: "test-intent-2",
        },
      });

      const response = await requestApp
        .get("admin/fundraiserPledges?search=Abbey")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(
        response.body.results[0].fundraiser.trackGroups[0].title,
        "Abbey Road"
      );
    });

    it("should support pagination", async () => {
      const { user: adminUser, accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const artist = await createArtist(adminUser.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          description: "A test fundraiser",
          goalAmount: 10000,
          trackGroups: {
            connect: [{ id: trackGroup.id }],
          },
        },
      });

      // Create 25 pledges
      for (let i = 0; i < 25; i++) {
        const user = (
          await createUser({
            email: `pledger${i}@user.com`,
          })
        ).user;

        await prisma.fundraiserPledge.create({
          data: {
            userId: user.id,
            fundraiserId: fundraiser.id,
            amount: 1000 + i,
            stripeSetupIntentId: `test-intent-${i}`,
          },
        });
      }

      // Get first page with default limit
      const page1 = await requestApp
        .get("admin/fundraiserPledges?page=1&limit=10")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(page1.statusCode === 200);
      assert.equal(page1.body.results.length, 10);
      assert.equal(page1.body.total, 25);
      assert.equal(page1.body.page, 1);
      assert.equal(page1.body.limit, 10);
      assert.equal(page1.body.pages, 3);

      // Get second page
      const page2 = await requestApp
        .get("admin/fundraiserPledges?page=2&limit=10")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(page2.statusCode === 200);
      assert.equal(page2.body.results.length, 10);
      assert.equal(page2.body.page, 2);

      // Ensure different pledges on different pages
      const page1Ids = page1.body.results.map((p: any) => p.id);
      const page2Ids = page2.body.results.map((p: any) => p.id);
      assert(!page1Ids.some((id: number) => page2Ids.includes(id)));
    });

    it("should combine filters and search", async () => {
      const { user: adminUser, accessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });

      const pledgerUser1 = (
        await createUser({
          email: "pledger1@user.com",
          name: "John Smith",
        })
      ).user;

      const pledgerUser2 = (
        await createUser({
          email: "pledger2@user.com",
          name: "John Doe",
        })
      ).user;

      const artist = await createArtist(adminUser.id);
      const trackGroup = await createTrackGroup(artist.id);

      const fundraiser = await prisma.fundraiser.create({
        data: {
          name: "Test Fundraiser",
          description: "A test fundraiser",
          goalAmount: 10000,
          trackGroups: {
            connect: [{ id: trackGroup.id }],
          },
        },
      });

      // John Smith - paid
      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser1.id,
          fundraiserId: fundraiser.id,
          amount: 5000,
          stripeSetupIntentId: "test-intent-1",
          paidAt: new Date(),
        },
      });

      // John Doe - pending
      await prisma.fundraiserPledge.create({
        data: {
          userId: pledgerUser2.id,
          fundraiserId: fundraiser.id,
          amount: 3000,
          stripeSetupIntentId: "test-intent-2",
        },
      });

      const response = await requestApp
        .get("admin/fundraiserPledges?search=John&pledgeStatus=paid")
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert(response.statusCode === 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].user.name, "John Smith");
      assert.equal(response.body.results[0].amount, 5000);
      assert(response.body.results[0].paidAt);
    });
  });
});
