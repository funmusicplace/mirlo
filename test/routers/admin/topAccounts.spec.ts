import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import {
  clearTables,
  createArtist,
  createMerch,
  createTrack,
  createTrackGroup,
  createUser,
  createUserTrackGroupPurchase,
} from "../../utils";

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

  it("should rank artists by free downloads and by uploads within the period", async () => {
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });
    const { user: artistUser } = await createUser({ email: "a@a.com" });
    const { user: otherArtistUser } = await createUser({ email: "b@b.com" });
    const { user: fan } = await createUser({ email: "fan@fan.com" });
    const { user: otherFan } = await createUser({ email: "fan2@fan.com" });

    const artist = await createArtist(artistUser.id, { name: "Freebie" });
    const otherArtist = await createArtist(otherArtistUser.id, {
      name: "Prolific",
    });
    const freeAlbum = await createTrackGroup(artist.id, { tracks: [] });
    const otherAlbum = await createTrackGroup(otherArtist.id, {
      urlSlug: "other",
      tracks: [],
    });
    const secondAlbum = await createTrackGroup(otherArtist.id, {
      urlSlug: "second",
      tracks: [],
    });

    // Two free downloads for Freebie: no transaction, and a $0 one.
    await prisma.userTrackGroupPurchase.create({
      data: { userId: fan.id, trackGroupId: freeAlbum.id },
    });
    await createUserTrackGroupPurchase(otherFan.id, freeAlbum.id, {
      amount: 0,
    });
    // Paid, subscription-granted and old acquisitions don't count.
    await createUserTrackGroupPurchase(fan.id, otherAlbum.id, {
      amount: 1000,
    });
    await prisma.userTrackGroupPurchase.create({
      data: {
        userId: otherFan.id,
        trackGroupId: otherAlbum.id,
        proGratis: true,
      },
    });
    await prisma.userTrackGroupPurchase.create({
      data: {
        userId: fan.id,
        trackGroupId: secondAlbum.id,
        createdAt: daysAgo(180),
      },
    });

    // Freebie uploads one track; Prolific three across two albums, plus a
    // deleted one and an old one.
    await createTrack(freeAlbum.id);
    await createTrack(otherAlbum.id);
    await createTrack(otherAlbum.id);
    await createTrack(secondAlbum.id);
    const deleted = await createTrack(secondAlbum.id);
    await prisma.track.update({
      where: { id: deleted.id },
      data: { deletedAt: new Date() },
    });
    const old = await createTrack(secondAlbum.id);
    await prisma.track.update({
      where: { id: old.id },
      data: { createdAt: daysAgo(180) },
    });

    const month = await requestApp
      .get("admin/topAccounts?period=month")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(month.statusCode, 200);
    assert.deepEqual(
      month.body.result.freeDownloads.map(
        (a: { name: string; downloadCount: number }) => [
          a.name,
          a.downloadCount,
        ]
      ),
      [["Freebie", 2]]
    );
    assert.deepEqual(
      month.body.result.uploaders.map(
        (a: { name: string; trackCount: number; trackGroupCount: number }) => [
          a.name,
          a.trackCount,
          a.trackGroupCount,
        ]
      ),
      [
        ["Prolific", 3, 2],
        ["Freebie", 1, 1],
      ]
    );

    const year = await requestApp
      .get("admin/topAccounts?period=year")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.deepEqual(
      year.body.result.freeDownloads.map(
        (a: { name: string; downloadCount: number }) => [
          a.name,
          a.downloadCount,
        ]
      ),
      [
        ["Freebie", 2],
        ["Prolific", 1],
      ]
    );
    assert.equal(year.body.result.uploaders[0].trackCount, 4);
  });

  it("should rank albums by downloads within the period", async () => {
    const { accessToken } = await createUser({
      email: "admin@admin.com",
      isAdmin: true,
    });
    const { user: artistUser } = await createUser({ email: "a@a.com" });
    const { user: fan } = await createUser({ email: "fan@fan.com" });

    const artist = await createArtist(artistUser.id, { name: "Downloaded" });
    const popular = await createTrackGroup(artist.id, { title: "Popular" });
    const niche = await createTrackGroup(artist.id, { title: "Niche" });
    const deleted = await createTrackGroup(artist.id, { title: "Deleted" });

    // Repeat downloads, including anonymous ones, each count.
    await prisma.trackGroupDownload.createMany({
      data: [
        { trackGroupId: popular.id, userId: fan.id },
        { trackGroupId: popular.id, userId: fan.id },
        { trackGroupId: popular.id },
        { trackGroupId: niche.id, userId: fan.id },
        { trackGroupId: niche.id, createdAt: daysAgo(180) },
        { trackGroupId: niche.id, createdAt: daysAgo(180) },
        { trackGroupId: niche.id, createdAt: daysAgo(180) },
        { trackGroupId: deleted.id },
      ],
    });
    await prisma.trackGroup.update({
      where: { id: deleted.id },
      data: { deletedAt: new Date() },
    });

    const month = await requestApp
      .get("admin/topAccounts?period=month")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.equal(month.statusCode, 200);
    assert.deepEqual(
      month.body.result.downloadedAlbums.map(
        (a: { title: string; artistName: string; downloadCount: number }) => [
          a.title,
          a.artistName,
          a.downloadCount,
        ]
      ),
      [
        ["Popular", "Downloaded", 3],
        ["Niche", "Downloaded", 1],
      ]
    );

    const year = await requestApp
      .get("admin/topAccounts?period=year")
      .set("Cookie", [`jwt=${accessToken}`])
      .set("Accept", "application/json");

    assert.deepEqual(
      year.body.result.downloadedAlbums.map(
        (a: { title: string; downloadCount: number }) => [
          a.title,
          a.downloadCount,
        ]
      ),
      [
        ["Niche", 4],
        ["Popular", 3],
      ]
    );
  });
});
