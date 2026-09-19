import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import { clearTables, createArtist, createTier, createUser } from "../../utils";

import prisma from "@mirlo/prisma";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

const requestApp = request(baseURL);

// Postgres's DATE_TRUNC('week', ...) buckets to the Monday of the ISO week.
const mondayOf = (date: Date) => {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
};

const firstOfMonth = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-01`;

describe("admin/stats", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 401 without user", async () => {
    const response = await requestApp
      .get("admin/stats")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 401);
  });

  it("should GET / 401 without admin", async () => {
    const { accessToken } = await createUser({ email: "artist@artist.com" });

    const response = await requestApp
      .get("admin/stats")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 401);
  });

  it("should GET / 200 with admin and return the expected shape", async () => {
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });

    const response = await requestApp
      .get("admin/stats")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    const { result } = response.body;
    assert.equal(result.granularity, "week");
    assert(Array.isArray(result.userSignups));
    assert(Array.isArray(result.artistSignups));
    assert(Array.isArray(result.revenue));
    assert(Array.isArray(result.transactionCounts));
    assert.equal(typeof result.avgMonthlyPlays, "number");
    assert.equal(typeof result.avgMonthlyActiveUsers, "number");
    assert.equal(typeof result.avgMonthlyAlbumDownloads, "number");
  });

  it("should split revenue into purchases/subscriptions, USD/converted", async () => {
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });
    const { user: artistUser } = await createUser({
      email: "artist@artist.com",
    });
    const { user: buyer } = await createUser({ email: "buyer@buyer.com" });
    const { user: foreignBuyer } = await createUser({
      email: "foreign-buyer@buyer.com",
    });
    const artist = await createArtist(artistUser.id);
    const tier = await createTier(artist.id);

    const now = new Date();
    const week = mondayOf(now);

    // USD purchase (no linked subscription charge)
    await prisma.userTransaction.create({
      data: {
        userId: buyer.id,
        amount: 1000,
        currency: "usd",
        createdAt: now,
      },
    });

    // USD subscription charge
    const usdSubTx = await prisma.userTransaction.create({
      data: {
        userId: buyer.id,
        amount: 500,
        currency: "usd",
        createdAt: now,
      },
    });
    const usdSub = await prisma.profileUserSubscription.create({
      data: {
        userId: buyer.id,
        profileSubscriptionTierId: tier.id,
        amount: 500,
      },
    });
    await prisma.profileUserSubscriptionCharge.create({
      data: {
        profileUserSubscriptionId: usdSub.id,
        transactionId: usdSubTx.id,
      },
    });

    // Foreign-currency purchase, converted to USD
    await prisma.userTransaction.create({
      data: {
        userId: buyer.id,
        amount: 2000,
        currency: "eur",
        platformCurrency: "usd",
        platformCurrencyAmount: 1800,
        exchangeRate: 0.9,
        createdAt: now,
      },
    });

    // Foreign-currency subscription charge, converted to USD
    const foreignSubTx = await prisma.userTransaction.create({
      data: {
        userId: foreignBuyer.id,
        amount: 700,
        currency: "gbp",
        platformCurrency: "usd",
        platformCurrencyAmount: 850,
        exchangeRate: 1.2,
        createdAt: now,
      },
    });
    const foreignSub = await prisma.profileUserSubscription.create({
      data: {
        userId: foreignBuyer.id,
        profileSubscriptionTierId: tier.id,
        amount: 700,
      },
    });
    await prisma.profileUserSubscriptionCharge.create({
      data: {
        profileUserSubscriptionId: foreignSub.id,
        transactionId: foreignSubTx.id,
      },
    });

    const response = await requestApp
      .get("admin/stats")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);

    const weekRow = response.body.result.revenue.find(
      (row: { date: string }) => row.date === week
    );
    assert(weekRow, `expected a revenue row for week ${week}`);
    assert.equal(weekRow.purchasesUsdCents, 1000);
    assert.equal(weekRow.subscriptionsUsdCents, 500);
    assert.equal(weekRow.purchasesConvertedUsdCents, 1800);
    assert.equal(weekRow.subscriptionsConvertedUsdCents, 850);
  });

  it("should count transactionCounts per currency", async () => {
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });
    const { user: buyer } = await createUser({ email: "buyer@buyer.com" });

    const now = new Date();
    const week = mondayOf(now);

    await prisma.userTransaction.createMany({
      data: [
        { userId: buyer.id, amount: 100, currency: "usd", createdAt: now },
        { userId: buyer.id, amount: 200, currency: "usd", createdAt: now },
        { userId: buyer.id, amount: 300, currency: "usd", createdAt: now },
        { userId: buyer.id, amount: 400, currency: "eur", createdAt: now },
        { userId: buyer.id, amount: 500, currency: "eur", createdAt: now },
      ],
    });

    const response = await requestApp
      .get("admin/stats")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);

    const rows = response.body.result.transactionCounts.filter(
      (row: { date: string }) => row.date === week
    );
    const usdRow = rows.find(
      (row: { currency: string }) => row.currency === "usd"
    );
    const eurRow = rows.find(
      (row: { currency: string }) => row.currency === "eur"
    );
    assert(usdRow, `expected a usd transactionCounts row for week ${week}`);
    assert(eurRow, `expected a eur transactionCounts row for week ${week}`);
    assert.equal(usdRow.count, 3);
    assert.equal(eurRow.count, 2);
  });

  it("should split revenue into USD and converted platform cuts", async () => {
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });
    const { user: buyer } = await createUser({ email: "buyer@buyer.com" });

    const now = new Date();
    const week = mondayOf(now);

    await prisma.userTransaction.createMany({
      data: [
        {
          userId: buyer.id,
          amount: 1000,
          currency: "usd",
          platformCut: 100,
          createdAt: now,
        },
        {
          userId: buyer.id,
          amount: 500,
          currency: "usd",
          platformCut: 50,
          createdAt: now,
        },
        {
          userId: buyer.id,
          amount: 2000,
          currency: "eur",
          platformCut: 200,
          platformCurrency: "usd",
          exchangeRate: 0.9,
          createdAt: now,
        },
      ],
    });

    const response = await requestApp
      .get("admin/stats")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);

    const weekRow = response.body.result.revenue.find(
      (row: { date: string }) => row.date === week
    );
    assert(weekRow, `expected a revenue row for week ${week}`);
    assert.equal(weekRow.platformCutUsdCents, 150);
    assert.equal(weekRow.platformCutConvertedUsdCents, 180);
  });

  it("should bucket by month when asked for monthly granularity", async () => {
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });
    const { user: buyer } = await createUser({ email: "buyer@buyer.com" });

    const now = new Date();

    await prisma.userTransaction.createMany({
      data: [
        { userId: buyer.id, amount: 1000, currency: "usd", createdAt: now },
        { userId: buyer.id, amount: 500, currency: "usd", createdAt: now },
      ],
    });

    const response = await requestApp
      .get("admin/stats?granularity=month")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.granularity, "month");

    // Every bucket is the 1st of a month.
    response.body.result.revenue.forEach((row: { date: string }) => {
      assert.ok(
        row.date.endsWith("-01"),
        `expected a month bucket, got ${row.date}`
      );
    });

    const monthRow = response.body.result.revenue.find(
      (row: { date: string }) => row.date === firstOfMonth(now)
    );
    assert(monthRow, `expected a revenue row for ${firstOfMonth(now)}`);
    assert.equal(monthRow.purchasesUsdCents, 1500);
  });

  it("should fall back to the default when days is not a valid integer", async () => {
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });

    const response = await requestApp
      .get("admin/stats?days=not-a-number")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.granularity, "week");
  });

  it("should respect a valid days value", async () => {
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });
    const { user: buyer } = await createUser({ email: "buyer@buyer.com" });

    const now = new Date();
    const week = mondayOf(now);

    await prisma.userTransaction.create({
      data: { userId: buyer.id, amount: 1000, currency: "usd", createdAt: now },
    });

    const response = await requestApp
      .get("admin/stats?days=30")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    const weekRow = response.body.result.revenue.find(
      (row: { date: string }) => row.date === week
    );
    assert(weekRow, `expected a revenue row for week ${week}`);
    assert.equal(weekRow.purchasesUsdCents, 1000);
  });

  it("should leave FAILED transactions out of revenue and counts", async () => {
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });
    const { user: buyer } = await createUser({ email: "buyer@buyer.com" });

    const now = new Date();
    const week = mondayOf(now);

    await prisma.userTransaction.createMany({
      data: [
        {
          userId: buyer.id,
          amount: 1000,
          currency: "usd",
          platformCut: 100,
          paymentStatus: "COMPLETED",
          createdAt: now,
        },
        {
          userId: buyer.id,
          amount: 9999,
          currency: "usd",
          platformCut: 999,
          paymentStatus: "FAILED",
          createdAt: now,
        },
      ],
    });

    const response = await requestApp
      .get("admin/stats")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);

    const weekRow = response.body.result.revenue.find(
      (row: { date: string }) => row.date === week
    );
    assert(weekRow, `expected a revenue row for week ${week}`);
    assert.equal(weekRow.purchasesUsdCents, 1000);
    assert.equal(weekRow.platformCutUsdCents, 100);

    const usdRow = response.body.result.transactionCounts.find(
      (row: { date: string; currency: string }) =>
        row.date === week && row.currency === "usd"
    );
    assert(usdRow, `expected a usd transactionCounts row for week ${week}`);
    assert.equal(usdRow.count, 1);
  });
});
