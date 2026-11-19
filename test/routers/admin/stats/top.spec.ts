import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";
import request from "supertest";

import {
  clearTables,
  createArtist,
  createArtistLabel,
  createSiteSettings,
  createFundraiser,
  createFundraiserPledge,
  createMerch,
  createTier,
  createTrack,
  createTrackGroup,
  createTrackPlay,
  createUser,
  createUserTrackGroupPurchase,
  createUserTrackPurchase,
} from "../../../utils";

const baseURL = `${process.env.API_DOMAIN}/v1/`;

const requestApp = request(baseURL);

const daysAgo = (days: number) => new Date(Date.now() - days * 86400000);

const today = () => new Date().toISOString().slice(0, 10);

const createAdmin = async () =>
  (await createUser({ email: "admin@admin.com", isAdmin: true })).accessToken;

const get = (endpoint: string, accessToken: string) =>
  requestApp
    .get(`admin/stats/${endpoint}`)
    .set("Cookie", [`jwt=${accessToken}`])
    .set("Accept", "application/json");

const rows = async (endpoint: string, accessToken: string) => {
  const response = await get(endpoint, accessToken);
  assert.equal(response.statusCode, 200, JSON.stringify(response.body));
  return response.body.result.rows;
};

const parseCsv = (text: string) =>
  text
    .trim()
    .split("\n")
    .map((line) => line.split(",").map((cell) => cell.replace(/^"|"$/g, "")));

describe("admin/stats/top*", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should 401 without admin", async () => {
    const { accessToken } = await createUser({ email: "user@user.com" });

    const response = await get("topSellers", accessToken);

    assert.equal(response.statusCode, 401);
  });

  it("should reject unknown periods and out-of-range limits", async () => {
    const accessToken = await createAdmin();

    for (const query of ["period=week", "limit=0", "limit=501", "limit=abc"]) {
      const response = await get(`topSellers?${query}`, accessToken);
      assert.equal(response.statusCode, 400, query);
    }
  });

  it("should rank sellers and purchasers by USD within the period", async () => {
    const accessToken = await createAdmin();
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

    const monthSellers = await rows("topSellers?period=month", accessToken);
    assert.deepEqual(
      monthSellers.map(
        (s: { name: string; revenueCents: number; salesCount: number }) => [
          s.name,
          s.revenueCents,
          s.salesCount,
        ]
      ),
      [
        ["Big Seller", 5000, 2],
        ["Small Seller", 1000, 1],
      ]
    );

    const monthPurchasers = await rows(
      "topPurchasers?period=month",
      accessToken
    );
    assert.deepEqual(
      monthPurchasers.map(
        (p: { email: string; cents: number; artistCount: number }) => [
          p.email,
          p.cents,
          p.artistCount,
        ]
      ),
      [
        ["big@buyer.com", 5000, 1],
        ["small@buyer.com", 1000, 1],
      ]
    );

    const yearSellers = await rows("topSellers?period=year", accessToken);
    assert.deepEqual(
      yearSellers.map((s: { name: string; revenueCents: number }) => [
        s.name,
        s.revenueCents,
      ]),
      [
        ["Small Seller", 10000],
        ["Big Seller", 5000],
      ]
    );
    const yearPurchasers = await rows("topPurchasers?period=year", accessToken);
    assert.equal(yearPurchasers[0].email, "small@buyer.com");

    const limited = await rows("topSellers?period=year&limit=1", accessToken);
    assert.deepEqual(
      limited.map((s: { name: string }) => s.name),
      ["Small Seller"]
    );
  });

  it("should rank by the instance's default currency", async () => {
    const accessToken = await createAdmin();
    const { user: artistUser } = await createUser({ email: "a@a.com" });
    const { user: buyer } = await createUser({ email: "buyer@buyer.com" });
    const artist = await createArtist(artistUser.id, { name: "Euro Seller" });
    const trackGroup = await createTrackGroup(artist.id);
    await createSiteSettings({ defaultCurrency: "eur" });

    await createUserTrackGroupPurchase(buyer.id, trackGroup.id, {
      amount: 2000,
      currency: "eur",
    });

    const response = await get("topSellers?period=month", accessToken);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.currency, "eur");
    assert.deepEqual(
      response.body.result.rows.map(
        (s: { name: string; revenueCents: number }) => [s.name, s.revenueCents]
      ),
      [["Euro Seller", 2000]]
    );
  });

  it("should credit a charged pledge to the fundraiser's profile", async () => {
    const accessToken = await createAdmin();
    const { user: artistUser } = await createUser({ email: "a@a.com" });
    const { user: backer } = await createUser({ email: "backer@buyer.com" });
    const artist = await createArtist(artistUser.id, { name: "Fundraiser" });
    const fundraiser = await createFundraiser(artist.id, {
      name: "Standalone",
    });
    const pledgeTx = await prisma.userTransaction.create({
      data: { userId: backer.id, amount: 4000, currency: "usd" },
    });
    await createFundraiserPledge(fundraiser.id, backer.id, {
      amount: 4000,
      stripeSetupIntentId: "seti_pledge",
      paidAt: new Date(),
      associatedTransactionId: pledgeTx.id,
    });

    const sellers = await rows("topSellers?period=month", accessToken);

    assert.deepEqual(
      sellers.map((s: { name: string; revenueCents: number }) => [
        s.name,
        s.revenueCents,
      ]),
      [["Fundraiser", 4000]]
    );
  });

  it("should rank artists by free downloads and by uploads within the period", async () => {
    const accessToken = await createAdmin();
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

    const monthFree = await rows("topFreeDownloads?period=month", accessToken);
    assert.deepEqual(
      monthFree.map((a: { name: string; freeDownloads: number }) => [
        a.name,
        a.freeDownloads,
      ]),
      [["Freebie", 2]]
    );

    const monthUploads = await rows("topUploaders?period=month", accessToken);
    assert.deepEqual(
      monthUploads.map(
        (a: {
          name: string;
          tracksUploaded: number;
          albumsUploaded: number;
          trackCount: number;
        }) => [a.name, a.tracksUploaded, a.albumsUploaded, a.trackCount]
      ),
      [
        // Listed tracks include the old one but not the deleted one.
        ["Prolific", 3, 2, 4],
        ["Freebie", 1, 1, 1],
      ]
    );

    const yearFree = await rows("topFreeDownloads?period=year", accessToken);
    assert.deepEqual(
      yearFree.map((a: { name: string; freeDownloads: number }) => [
        a.name,
        a.freeDownloads,
      ]),
      [
        ["Freebie", 2],
        ["Prolific", 1],
      ]
    );
    const yearUploads = await rows("topUploaders?period=year", accessToken);
    assert.equal(yearUploads[0].tracksUploaded, 4);
  });

  it("should export every artist column as CSV", async () => {
    const accessToken = await createAdmin();
    const { user: artistUser } = await createUser({ email: "a@a.com" });
    const { user: labelUser } = await createUser({ email: "label@label.com" });
    const { user: buyer } = await createUser({ email: "buyer@buyer.com" });

    const artist = await createArtist(artistUser.id, { name: "Exported" });
    await prisma.profile.update({
      where: { id: artist.id },
      data: { location: "Montreal" },
    });
    await createArtist(labelUser.id, {
      name: "Label Co",
      isLabelProfile: true,
    });
    await createArtistLabel({ artistId: artist.id, labelUserId: labelUser.id });

    const album = await createTrackGroup(artist.id);
    await createMerch(artist.id);
    await createTier(artist.id, { name: "Default", isDefaultTier: true });
    await createTier(artist.id, { name: "Supporter", urlSlug: "supporter" });
    const deletedTier = await createTier(artist.id, {
      name: "Gone",
      urlSlug: "gone",
    });
    await prisma.profileSubscriptionTier.update({
      where: { id: deletedTier.id },
      data: { deletedAt: new Date() },
    });
    await createUserTrackGroupPurchase(buyer.id, album.id, { amount: 2000 });
    await prisma.trackGroupDownload.createMany({
      data: [{ trackGroupId: album.id }, { trackGroupId: album.id }],
    });

    const response = await requestApp
      .get("admin/stats/topSellers?period=month&format=csv")
      .set("Cookie", [`jwt=${accessToken}`]);

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"], /text\/csv/);
    assert.deepEqual(parseCsv(response.text), [
      [
        "Artist",
        "Email",
        "Created",
        "Label",
        "Location",
        "Albums",
        "Tracks",
        "Merch items",
        "Tiers",
        "Album downloads",
        "Free downloads",
        "Revenue (USD)",
        "Sales",
      ],
      [
        "Exported",
        "a@a.com",
        today(),
        "Label Co",
        "Montreal",
        "1",
        "1",
        "1",
        "1",
        "2",
        "0",
        "20.00",
        "1",
      ],
    ]);

    const uploads = await requestApp
      .get("admin/stats/topUploaders?period=month&format=csv")
      .set("Cookie", [`jwt=${accessToken}`]);

    assert.deepEqual(parseCsv(uploads.text)[0].slice(9, 11), [
      "Albums uploaded in period",
      "Tracks uploaded in period",
    ]);
  });

  it("should rank albums by downloads within the period", async () => {
    const accessToken = await createAdmin();
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

    // The album and one of its tracks bought separately both count.
    const popularTrack = await prisma.track.findFirstOrThrow({
      where: { trackGroupId: popular.id },
    });
    await createUserTrackGroupPurchase(fan.id, popular.id, { amount: 1500 });
    await createUserTrackPurchase(fan.id, popularTrack.id, { amount: 200 });

    const month = await rows("topAlbums?period=month", accessToken);
    assert.deepEqual(
      month.map(
        (a: {
          title: string;
          artistName: string;
          downloadCount: number;
          revenueCents: number;
          salesCount: number;
        }) => [
          a.title,
          a.artistName,
          a.downloadCount,
          a.revenueCents,
          a.salesCount,
        ]
      ),
      [
        ["Popular", "Downloaded", 3, 1700, 2],
        ["Niche", "Downloaded", 1, 0, 0],
      ]
    );

    const year = await rows("topAlbums?period=year", accessToken);
    assert.deepEqual(
      year.map((a: { title: string; downloadCount: number }) => [
        a.title,
        a.downloadCount,
      ]),
      [
        ["Niche", 4],
        ["Popular", 3],
      ]
    );
  });

  it("should rank logged-in listeners by plays within the period", async () => {
    const accessToken = await createAdmin();
    const { user: artistUser } = await createUser({ email: "a@a.com" });
    const { user: otherArtistUser } = await createUser({ email: "b@b.com" });
    const { user: keen } = await createUser({ email: "keen@fan.com" });
    const { user: casual } = await createUser({ email: "casual@fan.com" });

    const artist = await createArtist(artistUser.id, { name: "One" });
    const otherArtist = await createArtist(otherArtistUser.id, {
      name: "Two",
    });
    const album = await createTrackGroup(artist.id, { tracks: [] });
    const otherAlbum = await createTrackGroup(otherArtist.id, {
      urlSlug: "other",
      tracks: [],
    });
    const track = await createTrack(album.id);
    const otherTrack = await createTrack(otherAlbum.id);

    await createTrackPlay(track.id, { userId: keen.id });
    await createTrackPlay(track.id, { userId: keen.id });
    await createTrackPlay(otherTrack.id, { userId: keen.id });
    await createTrackPlay(track.id, { userId: casual.id });
    await createTrackPlay(track.id, {
      userId: casual.id,
      createdAt: daysAgo(180),
    });
    await createTrackPlay(track.id, {
      userId: casual.id,
      createdAt: daysAgo(180),
    });
    await createTrackPlay(track.id, {
      userId: casual.id,
      createdAt: daysAgo(180),
    });
    // Anonymous plays aren't anyone's.
    await createTrackPlay(track.id);

    const month = await rows("topListeners?period=month", accessToken);
    assert.deepEqual(
      month.map(
        (l: {
          email: string;
          playCount: number;
          trackCount: number;
          artistCount: number;
        }) => [l.email, l.playCount, l.trackCount, l.artistCount]
      ),
      [
        ["keen@fan.com", 3, 2, 2],
        ["casual@fan.com", 1, 1, 1],
      ]
    );

    const year = await rows("topListeners?period=year", accessToken);
    assert.deepEqual(
      year.map((l: { email: string; playCount: number }) => [
        l.email,
        l.playCount,
      ]),
      [
        ["casual@fan.com", 4],
        ["keen@fan.com", 3],
      ]
    );
  });
});
