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
  createProfileImage,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

describe("fundraisers/{id}", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  const setUp = async (
    fundraiserData: Parameters<typeof createFundraiser>[1] = {}
  ) => {
    const { user } = await createUser({ email: "artist@example.com" });
    const { user: backer } = await createUser({ email: "backer@example.com" });
    const artist = await createArtist(user.id, { urlSlug: "tidal-hours" });
    const fundraiser = await createFundraiser(artist.id, {
      name: "A van",
      urlSlug: "a-van",
      isPublic: true,
      isAllOrNothing: true,
      goalAmount: 100000,
      ...fundraiserData,
    });
    return { artist, backer, fundraiser };
  };

  it("finds a public fundraiser by the artist's and the fundraiser's slugs", async () => {
    const { backer, fundraiser } = await setUp();
    await createFundraiserPledge(fundraiser.id, backer.id, { amount: 2500 });

    const response = await requestApp
      .get("fundraisers/A-Van?artistId=tidal-hours")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.id, fundraiser.id);
    assert.equal(response.body.result.artist.urlSlug, "tidal-hours");
    assert.equal(response.body.result.amountRaised, 2500);
    assert.equal(response.body.result.pledgeCount, 1);
    assert.deepEqual(response.body.result.images, []);
    assert.equal(response.body.result.artist.apPrivateKey, undefined);
  });

  it("includes the artist's avatar with its sizes", async () => {
    const { artist } = await setUp();
    await createProfileImage(artist.id, "avatar", { url: ["avatar-x60"] });

    const response = await requestApp
      .get("fundraisers/a-van?artistId=tidal-hours")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.ok(response.body.result.artist.avatar.sizes[60]);
  });

  it("finds a public fundraiser by id", async () => {
    const { fundraiser } = await setUp();

    const response = await requestApp
      .get(`fundraisers/${fundraiser.id}`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.urlSlug, "a-van");
  });

  it("lists the six latest pledges without saying who made them", async () => {
    const { fundraiser } = await setUp();
    for (let i = 0; i < 8; i++) {
      const { user } = await createUser({ email: `backer${i}@example.com` });
      await createFundraiserPledge(fundraiser.id, user.id, {
        amount: 1000 + i,
        createdAt: new Date(2026, 0, 1 + i),
        cancelledAt: i === 7 ? new Date() : undefined,
      });
    }

    const response = await requestApp
      .get(`fundraisers/${fundraiser.id}`)
      .set("Accept", "application/json");

    const { recentPledges } = response.body.result;
    assert.deepEqual(
      recentPledges.map((p: { amount: number }) => p.amount),
      [1006, 1005, 1004, 1003, 1002, 1001]
    );
    assert.deepEqual(Object.keys(recentPledges[0]).sort(), [
      "amount",
      "createdAt",
      "id",
    ]);
    assert.equal(response.body.result.pledges, undefined);
  });

  it("raises the minimum pledge to Stripe's minimum charge", async () => {
    const { fundraiser } = await setUp({ minPledge: 0 });

    const response = await requestApp
      .get(`fundraisers/${fundraiser.id}`)
      .set("Accept", "application/json");

    assert.equal(response.body.result.minPledge, 50);
  });

  it("returns the currency of the artist's payee and its minimum", async () => {
    const { artist, fundraiser } = await setUp({ minPledge: 0 });
    const { user: payee } = await createUser({
      email: "payee@example.com",
      currency: "GBP",
    });
    await prisma.user.update({
      where: { id: artist.userId },
      data: { currency: "huf" },
    });

    const ownerCurrency = await requestApp
      .get(`fundraisers/${fundraiser.id}`)
      .set("Accept", "application/json");
    assert.equal(ownerCurrency.body.result.currency, "huf");
    assert.equal(ownerCurrency.body.result.minPledge, 17500);

    await prisma.profile.update({
      where: { id: artist.id },
      data: { paymentToUserId: payee.id },
    });

    const response = await requestApp
      .get(`fundraisers/${fundraiser.id}`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.result.currency, "gbp");
    assert.equal(response.body.result.minPledge, 30);
  });

  it("leaves out images that never finished uploading", async () => {
    const { fundraiser } = await setUp();
    const failed = await prisma.image.create({
      data: { url: [], dimensions: "square" },
    });
    const done = await prisma.image.create({
      data: { url: ["van-x600"], dimensions: "square" },
    });
    await prisma.fundraiserImage.create({
      data: { fundraiserId: fundraiser.id, imageId: failed.id, position: 0 },
    });
    await prisma.fundraiserImage.create({
      data: { fundraiserId: fundraiser.id, imageId: done.id, position: 1 },
    });

    const response = await requestApp
      .get(`fundraisers/${fundraiser.id}`)
      .set("Accept", "application/json");

    assert.deepEqual(
      response.body.result.images.map(
        (image: { imageId: string }) => image.imageId
      ),
      [done.id]
    );
  });

  it("doesn't expose the artist's payment account", async () => {
    const { artist, fundraiser } = await setUp();
    await prisma.user.update({
      where: { id: artist.userId },
      data: { stripeAccountId: "acct_secret" },
    });

    const response = await requestApp
      .get(`fundraisers/${fundraiser.id}`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.ok(!JSON.stringify(response.body).includes("acct_secret"));
  });

  it("hides fundraisers that aren't public", async () => {
    const { fundraiser } = await setUp({ isPublic: false });

    for (const path of [
      `fundraisers/${fundraiser.id}`,
      "fundraisers/a-van?artistId=tidal-hours",
    ]) {
      const response = await requestApp
        .get(path)
        .set("Accept", "application/json");
      assert.equal(response.statusCode, 404, path);
    }
  });

  it("hides fundraisers of disabled artists and deleted fundraisers", async () => {
    const { artist, fundraiser } = await setUp();
    await prisma.profile.update({
      where: { id: artist.id },
      data: { enabled: false },
    });
    const disabled = await requestApp
      .get(`fundraisers/${fundraiser.id}`)
      .set("Accept", "application/json");
    assert.equal(disabled.statusCode, 404);

    await prisma.profile.update({
      where: { id: artist.id },
      data: { enabled: true },
    });
    await prisma.fundraiser.delete({ where: { id: fundraiser.id } });
    const deleted = await requestApp
      .get(`fundraisers/${fundraiser.id}`)
      .set("Accept", "application/json");
    assert.equal(deleted.statusCode, 404);
  });

  it("doesn't find another artist's fundraiser by slug", async () => {
    await setUp();
    const { user } = await createUser({ email: "other@example.com" });
    await createArtist(user.id, { urlSlug: "other-artist" });

    const response = await requestApp
      .get("fundraisers/a-van?artistId=other-artist")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });
});
