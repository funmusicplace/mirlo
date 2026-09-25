import assert from "node:assert";

import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import {
  clearTables,
  createArtist,
  createMerch,
  createTrackGroup,
  createUser,
  createUserTrackGroupPurchase,
} from "../../utils";

import prisma from "@mirlo/prisma";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

const requestApp = request(baseURL);

const daysAgo = (days: number) => new Date(Date.now() - days * 86400000);

describe("admin/topAccounts", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 401 without admin", async () => {
    const { accessToken } = await createUser({ email: "user@user.com" });

    const response = await requestApp
      .get("admin/topAccounts")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 401);
  });

  it("should rank sellers and purchasers by USD within the period", async () => {
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });
    const { user: artistUser } = await createUser({ email: "a@a.com" });
    const { user: otherArtistUser } = await createUser({ email: "b@b.com" });
    const { user: bigBuyer } = await createUser({ email: "big@buyer.com" });
    const { user: smallBuyer } = await createUser({ email: "small@buyer.com" });

    const artist = await createArtist(artistUser.id, { name: "Big Seller" });
    const otherArtist = await createArtist(otherArtistUser.id, {
      name: "Small Seller",
    });
    const trackGroup = await createTrackGroup(artist.id);
    const otherTrackGroup = await createTrackGroup(otherArtist.id, {
      urlSlug: "other",
    });
    const merch = await createMerch(artist.id);

    // Big Seller: an album and a piece of merch this month.
    await createUserTrackGroupPurchase(bigBuyer.id, trackGroup.id, {
      amount: 2000,
    });
    const merchTx = await prisma.userTransaction.create({
      data: { userId: bigBuyer.id, amount: 3000, currency: "usd" },
    });
    await prisma.merchPurchase.create({
      data: {
        merchId: merch.id,
        userId: bigBuyer.id,
        quantity: 1,
        fulfillmentStatus: "NO_PROGRESS",
        transactionId: merchTx.id,
      },
    });

    // Small Seller: one album this month, one six months ago.
    await createUserTrackGroupPurchase(smallBuyer.id, otherTrackGroup.id, {
      amount: 1000,
    });
    const oldTx = await prisma.userTransaction.create({
      data: {
        userId: smallBuyer.id,
        amount: 9000,
        currency: "usd",
        createdAt: daysAgo(180),
      },
    });
    await prisma.userProfileTip.create({
      data: {
        userId: smallBuyer.id,
        profileId: otherArtist.id,
        transactionId: oldTx.id,
      },
    });

    // Failed charges never count.
    const failedTx = await prisma.userTransaction.create({
      data: {
        userId: smallBuyer.id,
        amount: 50000,
        currency: "usd",
        paymentStatus: "FAILED",
      },
    });
    await prisma.userProfileTip.create({
      data: {
        userId: smallBuyer.id,
        profileId: otherArtist.id,
        transactionId: failedTx.id,
      },
    });

    const month = await requestApp
      .get("admin/topAccounts?period=month")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(month.statusCode, 200);
    assert.deepEqual(
      month.body.result.sellers.map(
        (s: { name: string; usdCents: number; transactionCount: number }) => [
          s.name,
          s.usdCents,
          s.transactionCount,
        ]
      ),
      [
        ["Big Seller", 5000, 2],
        ["Small Seller", 1000, 1],
      ]
    );
    assert.deepEqual(
      month.body.result.purchasers.map(
        (p: { email: string; usdCents: number }) => [p.email, p.usdCents]
      ),
      [
        ["big@buyer.com", 5000],
        ["small@buyer.com", 1000],
      ]
    );

    const year = await requestApp
      .get("admin/topAccounts?period=year")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(year.statusCode, 200);
    assert.equal(year.body.result.period, "year");
    assert.deepEqual(
      year.body.result.sellers.map((s: { name: string; usdCents: number }) => [
        s.name,
        s.usdCents,
      ]),
      [
        ["Small Seller", 10000],
        ["Big Seller", 5000],
      ]
    );
    assert.equal(year.body.result.purchasers[0].email, "small@buyer.com");
  });
});
