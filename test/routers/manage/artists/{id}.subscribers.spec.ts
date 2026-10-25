import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createArtist,
  createProfileImage,
  createTier,
  createUser,
} from "../../../utils";

import prisma from "@mirlo/prisma";

import { requestApp } from "../../utils";

// Splits the (quoted, comma-separated) header + first data row of a CSV
// response into arrays, so tests can look up a value by column label
// regardless of column order. Only safe when no value contains a comma.
const parseCsvRow = (csvText: string) => {
  const [headerLine, rowLine] = csvText.trim().split("\n");
  const stripQuotes = (line: string) =>
    line.split(",").map((cell) => cell.replace(/^"|"$/g, ""));

  return { columns: stripQuotes(headerLine), values: stripQuotes(rowLine) };
};

describe("manage/artists/{artistId}/subscribers", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  describe("GET", () => {
    it("should get json", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      const response = await requestApp
        .get(`manage/artists/${artist.id}/subscribers`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body.results, []);
    });

    it("should get csv", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);

      await createProfileImage(artist.id, "avatar");

      const response = await requestApp
        .get(`manage/artists/${artist.id}/subscribers?format=csv`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 200);
      assert.equal(response.header["content-type"], "text/csv; charset=utf-8");
      assert.equal(response.text.split(",")[0], '"Email"');
    });

    it("should include shipping address and name in the csv", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: subscriber } = await createUser({
        email: "subscriber1@email.com",
        name: "Subscriber One",
      });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id, { isDefaultTier: true });

      await prisma.profileUserSubscription.create({
        data: {
          userId: subscriber.id,
          profileSubscriptionTierId: tier.id,
          amount: 500,
          shippingAddress: {
            name: "Jane Doe",
            address: {
              line1: "123 Main St",
              line2: "Apt 4",
              city: "Springfield",
              state: "IL",
              postal_code: "62704",
              country: "US",
            },
          },
        },
      });

      const response = await requestApp
        .get(`manage/artists/${artist.id}/subscribers?format=csv`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const [header, row] = response.text.trim().split("\n");

      assert(header.includes('"Shipping Name"'));
      assert(header.includes('"Shipping Address Line 1"'));
      assert(header.includes('"Shipping Address Line 2"'));
      assert(header.includes('"Shipping City"'));
      assert(header.includes('"Shipping State"'));
      assert(header.includes('"Shipping Postal Code"'));
      assert(header.includes('"Shipping Country"'));

      assert(row.includes('"Jane Doe"'));
      assert(row.includes('"123 Main St"'));
      assert(row.includes('"Apt 4"'));
      assert(row.includes('"Springfield"'));
      assert(row.includes('"IL"'));
      assert(row.includes('"62704"'));
      assert(row.includes('"US"'));
    });

    it("should show a next renew date for an active subscription and no cancel at date", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: subscriber } = await createUser({
        email: "subscriber1@email.com",
      });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id, { isDefaultTier: true });
      const nextBillingDate = new Date("2026-10-01T00:00:00.000Z");

      await prisma.profileUserSubscription.create({
        data: {
          userId: subscriber.id,
          profileSubscriptionTierId: tier.id,
          amount: 500,
          stripeSubscriptionKey: "sub_123",
          nextBillingDate,
        },
      });

      const response = await requestApp
        .get(`manage/artists/${artist.id}/subscribers?format=csv`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const { columns, values } = parseCsvRow(response.text);

      assert.equal(
        values[columns.indexOf("Next Renew Date")],
        nextBillingDate.toISOString()
      );
      assert.equal(values[columns.indexOf("Cancel At")], "");
    });

    it("should show a cancel at date (and no next renew date) for a subscription scheduled to cancel", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: subscriber } = await createUser({
        email: "subscriber1@email.com",
      });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id, { isDefaultTier: true });
      const nextBillingDate = new Date("2026-10-01T00:00:00.000Z");

      await prisma.profileUserSubscription.create({
        data: {
          userId: subscriber.id,
          profileSubscriptionTierId: tier.id,
          amount: 500,
          stripeSubscriptionKey: "sub_123",
          nextBillingDate,
          deleteReason: "USER_CANCELLED",
        },
      });

      const response = await requestApp
        .get(`manage/artists/${artist.id}/subscribers?format=csv`)
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const { columns, values } = parseCsvRow(response.text);

      assert.equal(values[columns.indexOf("Next Renew Date")], "");
      assert.equal(
        values[columns.indexOf("Cancel At")],
        nextBillingDate.toISOString()
      );
    });
  });

  describe("POST", () => {
    it("should upload new subscriptions", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id, { isDefaultTier: true });
      const subscriberEmail = "subscriber1@email.com";

      const response = await requestApp
        .post(`manage/artists/${artist.id}/subscribers`)
        .send({
          subscribers: [
            {
              email: subscriberEmail,
            },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const created = await prisma.user.findFirst({
        where: {
          email: subscriberEmail,
        },
      });

      assert.notEqual(created, null);
      assert(created);

      const subscription = await prisma.profileUserSubscription.findFirst({
        where: {
          userId: created.id,
          profileSubscriptionTierId: tier.id,
        },
      });

      assert.notEqual(subscription, null);
    });

    it("should handle a double subscription", async () => {
      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id, { isDefaultTier: true });
      const subscriberEmail = "subscriber1@email.com";

      const response = await requestApp
        .post(`manage/artists/${artist.id}/subscribers`)
        .send({
          subscribers: [
            {
              email: subscriberEmail,
            },
            {
              email: subscriberEmail,
            },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const created = await prisma.user.findFirst({
        where: {
          email: subscriberEmail,
        },
      });

      assert.notEqual(created, null);
      assert(created);

      const subscriptions = await prisma.profileUserSubscription.findMany({
        where: {
          userId: created.id,
          profileSubscriptionTierId: tier.id,
        },
      });

      assert.equal(subscriptions.length, 1);
    });

    it("should handle an existing user", async () => {
      const subscriberEmail = "subscriber1@email.com";

      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: subscriber } = await createUser({ email: subscriberEmail });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id, { isDefaultTier: true });

      const response = await requestApp
        .post(`manage/artists/${artist.id}/subscribers`)
        .send({
          subscribers: [
            {
              email: subscriberEmail,
            },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const created = await prisma.user.findFirst({
        where: {
          email: subscriberEmail,
        },
      });

      assert.notEqual(created, null);

      const subscription = await prisma.profileUserSubscription.findFirst({
        where: {
          userId: subscriber.id,
          profileSubscriptionTierId: tier.id,
        },
        include: {
          profileSubscriptionTier: true,
        },
      });

      assert.notEqual(subscription, null);
      assert.equal(subscription?.profileSubscriptionTier.isDefaultTier, true);
    });

    it("should handle an existing subscription", async () => {
      const subscriberEmail = "subscriber1@email.com";

      const { user, accessToken } = await createUser({ email: "test@testcom" });
      const { user: subscriber } = await createUser({ email: subscriberEmail });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id, { isDefaultTier: true });

      await prisma.profileUserSubscription.create({
        data: {
          userId: subscriber.id,
          profileSubscriptionTierId: tier.id,
          amount: 0,
        },
      });

      const response = await requestApp
        .post(`manage/artists/${artist.id}/subscribers`)
        .send({
          subscribers: [
            {
              email: subscriberEmail,
            },
          ],
        })
        .set("Cookie", [`jwt=${accessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const created = await prisma.user.findFirst({
        where: {
          email: subscriberEmail,
        },
      });

      assert.notEqual(created, null);
    });

    it("should not let an non-owner upload for an artist", async () => {
      const { accessToken: adminAccessToken } = await createUser({
        email: "rando@rando.com",
      });
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const subscriberEmail = "subscriber1@email.com";

      const response = await requestApp
        .post(`manage/artists/${artist.id}/subscribers`)
        .send({
          subscribers: [
            {
              email: subscriberEmail,
            },
          ],
        })
        .set("Cookie", [`jwt=${adminAccessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 404);
    });

    it("should let an admin upload for an artist", async () => {
      const { accessToken: adminAccessToken } = await createUser({
        email: "admin@admin.com",
        isAdmin: true,
      });
      const { user } = await createUser({ email: "test@testcom" });
      const artist = await createArtist(user.id);
      const tier = await createTier(artist.id, { isDefaultTier: true });
      const subscriberEmail = "subscriber1@email.com";

      const response = await requestApp
        .post(`manage/artists/${artist.id}/subscribers`)
        .send({
          subscribers: [
            {
              email: subscriberEmail,
            },
          ],
        })
        .set("Cookie", [`jwt=${adminAccessToken}`])
        .set("Accept", "application/json");

      assert.equal(response.statusCode, 200);

      const created = await prisma.user.findFirst({
        where: {
          email: subscriberEmail,
        },
      });

      assert.notEqual(created, null);
      assert(created);

      const subscription = await prisma.profileUserSubscription.findFirst({
        where: {
          userId: created.id,
          profileSubscriptionTierId: tier.id,
        },
      });

      assert.notEqual(subscription, null);
    });
  });
});
