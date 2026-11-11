import assert from "node:assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { describe, it } from "mocha";

import {
  clearTables,
  createFundraiser,
  createFundraiserPledge,
  createProfile,
  createTrackGroup,
  createUser,
} from "../../utils";
import { requestApp } from "../utils";

const createSale = async (userId: number, amount: number) =>
  prisma.userTransaction.create({
    data: { userId, amount, currency: "usd", platformCut: 0, stripeCut: 0 },
  });

describe("trackGroups/{id}/supporters", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  it("should GET / 404", async () => {
    const response = await requestApp
      .get("trackGroups/1/supporters")
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });

  it("should GET / only totals for this release", async () => {
    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const { user } = await createUser({ email: "supporter@test.com" });
    const profile = await createProfile(artistUser.id);
    const trackGroup = await createTrackGroup(profile.id, {
      urlSlug: "release",
    });
    const otherTrackGroup = await createTrackGroup(profile.id, {
      urlSlug: "other-release",
    });

    const purchase = await createSale(user.id, 1000);
    await prisma.userTrackGroupPurchase.create({
      data: {
        userId: user.id,
        userTransactionId: purchase.id,
        trackGroupId: trackGroup.id,
        message: "private note",
      },
    });

    const otherPurchase = await createSale(user.id, 500);
    await prisma.userTrackGroupPurchase.create({
      data: {
        userId: user.id,
        userTransactionId: otherPurchase.id,
        trackGroupId: otherTrackGroup.id,
      },
    });

    const tip = await createSale(user.id, 3000);
    await prisma.userProfileTip.create({
      data: { userId: user.id, profileId: profile.id, transactionId: tip.id },
    });

    const response = await requestApp
      .get(`trackGroups/${trackGroup.id}/supporters`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.results, undefined);
    assert.equal(response.body.total, 1);
    assert.equal(response.body.totalAmount, 1000);
    assert.equal(response.body.totalSupporters, 1);
  });

  it("should report an all-or-nothing fundraiser's pledges as raised, like the fundraiser page", async () => {
    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const { user } = await createUser({ email: "supporter@test.com" });
    const { user: backer } = await createUser({ email: "backer@test.com" });
    const profile = await createProfile(artistUser.id);
    const trackGroup = await createTrackGroup(profile.id);
    const fundraiser = await createFundraiser(profile.id, {
      trackGroupId: trackGroup.id,
      isAllOrNothing: true,
    });
    await createFundraiserPledge(fundraiser.id, backer.id, { amount: 5000 });
    const purchase = await createSale(user.id, 1000);
    await prisma.userTrackGroupPurchase.create({
      data: {
        userId: user.id,
        userTransactionId: purchase.id,
        trackGroupId: trackGroup.id,
      },
    });

    const response = await requestApp
      .get(`trackGroups/${trackGroup.id}/supporters`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.totalAmount, 5000);
  });

  it("should report sales of all the fundraiser's releases as raised", async () => {
    const { user: artistUser } = await createUser({ email: "artist@test.com" });
    const { user } = await createUser({ email: "supporter@test.com" });
    const profile = await createProfile(artistUser.id);
    const trackGroup = await createTrackGroup(profile.id, { urlSlug: "one" });
    const otherTrackGroup = await createTrackGroup(profile.id, {
      urlSlug: "two",
    });
    const fundraiser = await createFundraiser(profile.id, {
      trackGroupId: trackGroup.id,
    });
    await prisma.fundraiser.update({
      where: { id: fundraiser.id },
      data: { trackGroups: { connect: { id: otherTrackGroup.id } } },
    });
    for (const [tg, amount] of [
      [trackGroup, 1000],
      [otherTrackGroup, 500],
    ] as const) {
      const sale = await createSale(user.id, amount);
      await prisma.userTrackGroupPurchase.create({
        data: {
          userId: user.id,
          userTransactionId: sale.id,
          trackGroupId: tg.id,
        },
      });
    }

    const response = await requestApp
      .get(`trackGroups/${trackGroup.id}/supporters`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.totalAmount, 1500);
  });

  it("should not serve the artist-wide supporters list", async () => {
    const { user } = await createUser({ email: "artist@test.com" });
    const profile = await createProfile(user.id);

    const response = await requestApp
      .get(`artists/${profile.id}/supporters`)
      .set("Accept", "application/json");

    assert.equal(response.statusCode, 404);
  });
});
